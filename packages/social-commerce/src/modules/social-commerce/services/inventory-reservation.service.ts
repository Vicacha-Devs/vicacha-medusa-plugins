import { randomUUID } from "node:crypto"
import { MedusaError } from "../utils/medusa-error.js"
import type {
  ReservationRecord,
  ReservationStatus,
  ReserveLiveStockInput,
  StockAvailabilityInfo,
} from "../types/index.js"

/**
 * Minimal Redis client interface compatible with ioredis so callers can
 * inject either a real `ioredis` instance or a custom Redis adapter.
 */
export interface RedisLikeClient {
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<unknown>
  get(key: string): Promise<string | null>
  set(key: string, value: string, ...args: (string | number)[]): Promise<unknown>
  del(...keys: string[]): Promise<number>
  sadd(key: string, ...members: string[]): Promise<number>
  smembers(key: string): Promise<string[]>
  srem(key: string, ...members: string[]): Promise<number>
  quit?(): Promise<unknown>
}

const DEFAULT_RESERVATION_TTL_SECONDS = 600 // 10 minutes

const RESERVE_STOCK_LUA = `
local stock_key = KEYS[1]
local reserved_key = KEYS[2]
local reservation_key = KEYS[3]
local session_set_key = KEYS[4]

local quantity = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local reservation_json = ARGV[3]
local reservation_id = ARGV[4]

local available = tonumber(redis.call('GET', stock_key) or '0')
local reserved = tonumber(redis.call('GET', reserved_key) or '0')

if (available - reserved) < quantity then
  return 0
end

redis.call('INCRBY', reserved_key, quantity)
redis.call('SET', reservation_key, reservation_json, 'EX', ttl)
redis.call('SADD', session_set_key, reservation_id)
return 1
`

const RELEASE_STOCK_LUA = `
local reserved_key = KEYS[1]
local reservation_key = KEYS[2]
local session_set_key = KEYS[3]
local reservation_id = ARGV[1]

local data = redis.call('GET', reservation_key)
if not data then
  redis.call('SREM', session_set_key, reservation_id)
  return 0
end

local reservation = cjson.decode(data)
if reservation.status ~= 'held' then
  return 0
end

local qty = tonumber(reservation.quantity)
local current_reserved = tonumber(redis.call('GET', reserved_key) or '0')
local new_reserved = math.max(0, current_reserved - qty)

redis.call('SET', reserved_key, tostring(new_reserved))
redis.call('DEL', reservation_key)
redis.call('SREM', session_set_key, reservation_id)
return qty
`

const CONFIRM_STOCK_LUA = `
local stock_key = KEYS[1]
local reserved_key = KEYS[2]
local reservation_key = KEYS[3]

local data = redis.call('GET', reservation_key)
if not data then
  return 0
end

local reservation = cjson.decode(data)
if reservation.status ~= 'held' then
  return 0
end

local qty = tonumber(reservation.quantity)
local current_stock = tonumber(redis.call('GET', stock_key) or '0')
local current_reserved = tonumber(redis.call('GET', reserved_key) or '0')

redis.call('SET', stock_key, tostring(math.max(0, current_stock - qty)))
redis.call('SET', reserved_key, tostring(math.max(0, current_reserved - qty)))

reservation.status = 'confirmed'
redis.call('SET', reservation_key, cjson.encode(reservation), 'EX', 3600)
return qty
`

interface InMemoryStockBucket {
  total: number
  reserved: number
}

/**
 * Dual-mode Live Shopping Stock Reservation Engine.
 *
 * - **Redis Mode**: Uses atomic Lua scripts + session index sets (`SADD`/`SMEMBERS`)
 *   for distributed multi-instance flash-sale concurrency control without `KEYS *`.
 * - **In-Memory Fallback Mode**: Uses per-key async mutex locks + deterministic TTL
 *   sweeps so development and single-node deployments work with zero Redis setup.
 */
export class InventoryReservationService {
  private readonly redis: RedisLikeClient | null
  private readonly defaultTtlSeconds: number

  // In-memory state when Redis is not configured
  private readonly stockBuckets = new Map<string, InMemoryStockBucket>()
  private readonly reservations = new Map<string, ReservationRecord>()
  private readonly sessionIndex = new Map<string, Set<string>>()
  private readonly keyLocks = new Map<string, Promise<void>>()

  constructor(options?: {
    redisClient?: RedisLikeClient | null
    defaultTtlSeconds?: number
  }) {
    this.redis = options?.redisClient ?? null
    this.defaultTtlSeconds =
      options?.defaultTtlSeconds && options.defaultTtlSeconds > 0
        ? Math.floor(options.defaultTtlSeconds)
        : DEFAULT_RESERVATION_TTL_SECONDS
  }

  get mode(): "redis" | "memory" {
    return this.redis ? "redis" : "memory"
  }

  private stockKey(sessionId: string, variantId: string): string {
    return `live:stock:${sessionId}:${variantId}`
  }

  private reservedKey(sessionId: string, variantId: string): string {
    return `live:reserved:${sessionId}:${variantId}`
  }

  private reservationKey(reservationId: string): string {
    return `live:reservation:${reservationId}`
  }

  private sessionSetKey(sessionId: string): string {
    return `live:session_reservations:${sessionId}`
  }

  private bucketKey(sessionId: string, variantId: string): string {
    return `${sessionId}::${variantId}`
  }

  /**
   * Serializes concurrent operations on the same in-memory bucket key.
   */
  private async withKeyLock<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const previous = this.keyLocks.get(key) ?? Promise.resolve()
    let release!: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })
    this.keyLocks.set(
      key,
      previous.then(() => next)
    )
    await previous
    try {
      return await fn()
    } finally {
      release()
      if (this.keyLocks.get(key) === next) {
        this.keyLocks.delete(key)
      }
    }
  }

  /**
   * Purges expired in-memory reservations for a given session (or all sessions)
   * and returns their held quantities to the available pool.
   */
  private sweepExpiredMemoryReservations(nowMs: number = Date.now(), sessionId?: string): number {
    let releasedCount = 0
    for (const [id, record] of this.reservations.entries()) {
      if (sessionId && record.session_id !== sessionId) {
        continue
      }
      if (record.status === "held" && record.expires_at <= nowMs) {
        const bKey = this.bucketKey(record.session_id, record.variant_id)
        const bucket = this.stockBuckets.get(bKey)
        if (bucket) {
          bucket.reserved = Math.max(0, bucket.reserved - record.quantity)
        }
        record.status = "expired"
        this.reservations.delete(id)
        this.sessionIndex.get(record.session_id)?.delete(id)
        releasedCount += 1
      }
    }
    return releasedCount
  }

  /**
   * Initializes available stock for a product variant during a live stream session.
   */
  async initializeLiveStock(
    sessionId: string,
    variantId: string,
    quantity: number,
    ttlSeconds: number = 86400
  ): Promise<StockAvailabilityInfo> {
    if (!sessionId?.trim()) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "session_id is required to initialize live stock.")
    }
    if (!variantId?.trim()) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "variant_id is required to initialize live stock.")
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Initial live stock quantity must be a non-negative integer."
      )
    }

    const normalizedQty = Math.floor(quantity)

    if (this.redis) {
      await this.redis.set(
        this.stockKey(sessionId, variantId),
        String(normalizedQty),
        "EX",
        ttlSeconds
      )
      await this.redis.set(
        this.reservedKey(sessionId, variantId),
        "0",
        "EX",
        ttlSeconds
      )
      return {
        total: normalizedQty,
        reserved: 0,
        available: normalizedQty,
      }
    }

    const bKey = this.bucketKey(sessionId, variantId)
    return this.withKeyLock(bKey, () => {
      this.stockBuckets.set(bKey, { total: normalizedQty, reserved: 0 })
      return {
        total: normalizedQty,
        reserved: 0,
        available: normalizedQty,
      }
    })
  }

  /**
   * Atomically reserves stock for a customer or cart during a live stream flash sale.
   */
  async reserveStock(
    input: ReserveLiveStockInput,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord> {
    const {
      session_id,
      product_id,
      variant_id,
      quantity,
      customer_id = null,
      cart_id = null,
      ttl_seconds,
    } = input

    if (!session_id?.trim() || !product_id?.trim() || !variant_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "session_id, product_id, and variant_id are required to reserve live stock."
      )
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Reservation quantity must be a positive integer."
      )
    }

    const ttl =
      ttl_seconds && ttl_seconds > 0 ? Math.floor(ttl_seconds) : this.defaultTtlSeconds
    const reservationId = `res_${randomUUID().replace(/-/g, "").slice(0, 20)}`

    const reservation: ReservationRecord = {
      id: reservationId,
      session_id,
      product_id,
      variant_id,
      customer_id,
      cart_id,
      quantity,
      created_at: nowMs,
      expires_at: nowMs + ttl * 1000,
      status: "held",
    }

    if (this.redis) {
      const result = await this.redis.eval(
        RESERVE_STOCK_LUA,
        4,
        this.stockKey(session_id, variant_id),
        this.reservedKey(session_id, variant_id),
        this.reservationKey(reservationId),
        this.sessionSetKey(session_id),
        quantity,
        ttl,
        JSON.stringify(reservation),
        reservationId
      )

      if (Number(result) !== 1) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `Insufficient live stock available for variant "${variant_id}" in session "${session_id}".`
        )
      }
      return reservation
    }

    const bKey = this.bucketKey(session_id, variant_id)
    return this.withKeyLock(bKey, () => {
      this.sweepExpiredMemoryReservations(nowMs, session_id)
      const bucket = this.stockBuckets.get(bKey)
      if (!bucket) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Live stock pool not initialized for variant "${variant_id}" in session "${session_id}".`
        )
      }

      const available = Math.max(0, bucket.total - bucket.reserved)
      if (available < quantity) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `Insufficient live stock available for variant "${variant_id}" (requested ${quantity}, available ${available}).`
        )
      }

      bucket.reserved += quantity
      this.reservations.set(reservationId, reservation)

      let set = this.sessionIndex.get(session_id)
      if (!set) {
        set = new Set<string>()
        this.sessionIndex.set(session_id, set)
      }
      set.add(reservationId)

      return { ...reservation }
    })
  }

  /**
   * Releases a held reservation and returns the reserved quantity to the available pool.
   */
  async releaseReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ released: boolean; quantity: number }> {
    if (!reservationId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "reservation_id is required to release a reservation."
      )
    }

    if (this.redis) {
      let targetSessionId = sessionId
      let targetVariantId = variantId
      if (!targetSessionId || !targetVariantId) {
        const existing = await this.getReservation(reservationId)
        if (!existing) {
          return { released: false, quantity: 0 }
        }
        targetSessionId = existing.session_id
        targetVariantId = existing.variant_id
      }

      const releasedQty = Number(
        await this.redis.eval(
          RELEASE_STOCK_LUA,
          3,
          this.reservedKey(targetSessionId, targetVariantId),
          this.reservationKey(reservationId),
          this.sessionSetKey(targetSessionId),
          reservationId
        )
      )
      return { released: releasedQty > 0, quantity: releasedQty }
    }

    const existing = this.reservations.get(reservationId)
    if (!existing) {
      return { released: false, quantity: 0 }
    }

    const bKey = this.bucketKey(existing.session_id, existing.variant_id)
    return this.withKeyLock(bKey, () => {
      const current = this.reservations.get(reservationId)
      if (!current || current.status !== "held") {
        return { released: false, quantity: 0 }
      }
      const bucket = this.stockBuckets.get(bKey)
      if (bucket) {
        bucket.reserved = Math.max(0, bucket.reserved - current.quantity)
      }
      current.status = "released"
      this.reservations.delete(reservationId)
      this.sessionIndex.get(current.session_id)?.delete(reservationId)
      return { released: true, quantity: current.quantity }
    })
  }

  /**
   * Confirms a reservation when an order is placed (`order.placed`), permanently
   * deducting the quantity from both total stock and reserved stock.
   */
  async confirmReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ confirmed: boolean; quantity: number; reservation: ReservationRecord | null }> {
    if (!reservationId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "reservation_id is required to confirm a reservation."
      )
    }

    if (this.redis) {
      const existing = await this.getReservation(reservationId)
      const targetSessionId = sessionId ?? existing?.session_id
      const targetVariantId = variantId ?? existing?.variant_id
      if (!targetSessionId || !targetVariantId) {
        return { confirmed: false, quantity: 0, reservation: null }
      }

      const confirmedQty = Number(
        await this.redis.eval(
          CONFIRM_STOCK_LUA,
          3,
          this.stockKey(targetSessionId, targetVariantId),
          this.reservedKey(targetSessionId, targetVariantId),
          this.reservationKey(reservationId)
        )
      )
      const updated = confirmedQty > 0 ? await this.getReservation(reservationId) : null
      return {
        confirmed: confirmedQty > 0,
        quantity: confirmedQty,
        reservation: updated,
      }
    }

    const existing = this.reservations.get(reservationId)
    if (!existing) {
      return { confirmed: false, quantity: 0, reservation: null }
    }

    const bKey = this.bucketKey(existing.session_id, existing.variant_id)
    return this.withKeyLock(bKey, () => {
      this.sweepExpiredMemoryReservations(Date.now(), existing.session_id)
      const current = this.reservations.get(reservationId)
      if (!current || current.status !== "held") {
        return { confirmed: false, quantity: 0, reservation: null }
      }

      const bucket = this.stockBuckets.get(bKey)
      if (bucket) {
        bucket.total = Math.max(0, bucket.total - current.quantity)
        bucket.reserved = Math.max(0, bucket.reserved - current.quantity)
      }
      current.status = "confirmed"
      return {
        confirmed: true,
        quantity: current.quantity,
        reservation: { ...current },
      }
    })
  }

  /**
   * Returns current total, reserved, and available stock for a variant in a live session.
   */
  async getAvailableStock(
    sessionId: string,
    variantId: string,
    nowMs: number = Date.now()
  ): Promise<StockAvailabilityInfo> {
    if (this.redis) {
      const [totalStr, reservedStr] = await Promise.all([
        this.redis.get(this.stockKey(sessionId, variantId)),
        this.redis.get(this.reservedKey(sessionId, variantId)),
      ])
      const total = Number.parseInt(totalStr ?? "0", 10) || 0
      const reserved = Number.parseInt(reservedStr ?? "0", 10) || 0
      return {
        total,
        reserved,
        available: Math.max(0, total - reserved),
      }
    }

    this.sweepExpiredMemoryReservations(nowMs, sessionId)
    const bucket = this.stockBuckets.get(this.bucketKey(sessionId, variantId))
    if (!bucket) {
      return { total: 0, reserved: 0, available: 0 }
    }
    return {
      total: bucket.total,
      reserved: bucket.reserved,
      available: Math.max(0, bucket.total - bucket.reserved),
    }
  }

  /**
   * Retrieves a reservation by ID.
   */
  async getReservation(
    reservationId: string,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord | null> {
    if (this.redis) {
      const data = await this.redis.get(this.reservationKey(reservationId))
      if (!data) {
        return null
      }
      try {
        return JSON.parse(data) as ReservationRecord
      } catch {
        return null
      }
    }

    this.sweepExpiredMemoryReservations(nowMs)
    const record = this.reservations.get(reservationId)
    return record ? { ...record } : null
  }

  /**
   * Lists active reservations for a session or cart.
   */
  async listReservations(
    filter?: {
      session_id?: string
      cart_id?: string
      status?: ReservationStatus
    },
    nowMs: number = Date.now()
  ): Promise<ReservationRecord[]> {
    if (this.redis && filter?.session_id) {
      const ids = await this.redis.smembers(this.sessionSetKey(filter.session_id))
      const results: ReservationRecord[] = []
      for (const id of ids) {
        const res = await this.getReservation(id, nowMs)
        if (!res) {
          await this.redis.srem(this.sessionSetKey(filter.session_id), id)
          continue
        }
        if (filter.cart_id && res.cart_id !== filter.cart_id) continue
        if (filter.status && res.status !== filter.status) continue
        results.push(res)
      }
      return results
    }

    this.sweepExpiredMemoryReservations(nowMs, filter?.session_id)
    const results: ReservationRecord[] = []
    for (const record of this.reservations.values()) {
      if (filter?.session_id && record.session_id !== filter.session_id) continue
      if (filter?.cart_id && record.cart_id !== filter.cart_id) continue
      if (filter?.status && record.status !== filter.status) continue
      results.push({ ...record })
    }
    return results
  }

  /**
   * Releases all held reservations for a live session (e.g., when a stream ends)
   * using the O(1) session index set instead of Redis `KEYS *`.
   */
  async releaseSessionReservations(sessionId: string): Promise<number> {
    if (!sessionId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "session_id is required to release session reservations."
      )
    }

    if (this.redis) {
      const ids = await this.redis.smembers(this.sessionSetKey(sessionId))
      let releasedCount = 0
      for (const id of ids) {
        const res = await this.getReservation(id)
        if (res && res.status === "held") {
          const { released } = await this.releaseReservation(
            id,
            res.session_id,
            res.variant_id
          )
          if (released) releasedCount += 1
        } else {
          await this.redis.srem(this.sessionSetKey(sessionId), id)
        }
      }
      await this.redis.del(this.sessionSetKey(sessionId))
      return releasedCount
    }

    const ids = Array.from(this.sessionIndex.get(sessionId) ?? [])
    let releasedCount = 0
    for (const id of ids) {
      const { released } = await this.releaseReservation(id)
      if (released) {
        releasedCount += 1
      }
    }
    this.sessionIndex.delete(sessionId)
    return releasedCount
  }

  /**
   * Sweeps expired reservations across all sessions and returns the number of
   * expired reservations reclaimed.
   */
  async cleanupExpiredReservations(nowMs: number = Date.now()): Promise<number> {
    if (this.redis) {
      // Redis TTL expires individual reservation keys automatically; this method
      // remains a safe no-op or reconciles known session sets if needed.
      return 0
    }
    return this.sweepExpiredMemoryReservations(nowMs)
  }
}
