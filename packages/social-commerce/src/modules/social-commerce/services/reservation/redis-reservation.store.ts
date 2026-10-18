import { MedusaError } from "../../utils/medusa-error"
import type {
  ReservationRecord,
  StockAvailabilityInfo,
} from "../../types/index"
import type {
  ListReservationsFilter,
  RedisLikeClient,
  ReservationStoreBackend,
} from "./reservation-store.interface"

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

/**
 * Distributed Redis-backed reservation store using atomic Lua scripts and O(1) session sets.
 */
export class RedisReservationStore implements ReservationStoreBackend {
  readonly mode = "redis" as const
  private readonly redis: RedisLikeClient

  constructor(redis: RedisLikeClient) {
    this.redis = redis
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

  async initializeLiveStock(
    sessionId: string,
    variantId: string,
    normalizedQty: number,
    ttlSeconds: number
  ): Promise<StockAvailabilityInfo> {
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

  async reserveStock(
    reservation: ReservationRecord,
    ttlSeconds: number,
    _nowMs: number
  ): Promise<ReservationRecord> {
    const { id, session_id, variant_id, quantity } = reservation
    const result = await this.redis.eval(
      RESERVE_STOCK_LUA,
      4,
      this.stockKey(session_id, variant_id),
      this.reservedKey(session_id, variant_id),
      this.reservationKey(id),
      this.sessionSetKey(session_id),
      quantity,
      ttlSeconds,
      JSON.stringify(reservation),
      id
    )

    if (Number(result) !== 1) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Insufficient live stock available for variant "${variant_id}" in session "${session_id}".`
      )
    }
    return reservation
  }

  async releaseReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ released: boolean; quantity: number }> {
    let targetSessionId = sessionId
    let targetVariantId = variantId
    if (!targetSessionId || !targetVariantId) {
      const existing = await this.getReservation(reservationId, Date.now())
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

  async confirmReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ confirmed: boolean; quantity: number; reservation: ReservationRecord | null }> {
    const existing = await this.getReservation(reservationId, Date.now())
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
    const updated =
      confirmedQty > 0 ? await this.getReservation(reservationId, Date.now()) : null
    return {
      confirmed: confirmedQty > 0,
      quantity: confirmedQty,
      reservation: updated,
    }
  }

  async getAvailableStock(
    sessionId: string,
    variantId: string,
    _nowMs: number
  ): Promise<StockAvailabilityInfo> {
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

  async getReservation(
    reservationId: string,
    _nowMs: number
  ): Promise<ReservationRecord | null> {
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

  async listReservations(
    filter: ListReservationsFilter | undefined,
    nowMs: number
  ): Promise<ReservationRecord[]> {
    if (!filter?.session_id) {
      return []
    }
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

  async releaseSessionReservations(sessionId: string): Promise<number> {
    const ids = await this.redis.smembers(this.sessionSetKey(sessionId))
    let releasedCount = 0
    for (const id of ids) {
      const res = await this.getReservation(id, Date.now())
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

  async cleanupExpiredReservations(_nowMs: number): Promise<number> {
    // Redis TTL expires individual reservation keys automatically.
    return 0
  }
}
