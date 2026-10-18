import { MedusaError } from "../../utils/medusa-error"
import type {
  ReservationRecord,
  StockAvailabilityInfo,
} from "../../types/index"
import type {
  ListReservationsFilter,
  ReservationStoreBackend,
} from "./reservation-store.interface"

interface InMemoryStockBucket {
  total: number
  reserved: number
}

/**
 * In-memory reservation store with per-key async mutex locks and deterministic TTL sweeps.
 */
export class InMemoryReservationStore implements ReservationStoreBackend {
  readonly mode = "memory" as const

  private readonly stockBuckets = new Map<string, InMemoryStockBucket>()
  private readonly reservations = new Map<string, ReservationRecord>()
  private readonly sessionIndex = new Map<string, Set<string>>()
  private readonly keyLocks = new Map<string, Promise<void>>()

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
  private sweepExpiredMemoryReservations(
    nowMs: number = Date.now(),
    sessionId?: string
  ): number {
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

  async initializeLiveStock(
    sessionId: string,
    variantId: string,
    normalizedQty: number,
    _ttlSeconds: number
  ): Promise<StockAvailabilityInfo> {
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

  async reserveStock(
    reservation: ReservationRecord,
    _ttlSeconds: number,
    nowMs: number
  ): Promise<ReservationRecord> {
    const { id, session_id, variant_id, quantity } = reservation
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
      this.reservations.set(id, reservation)

      let set = this.sessionIndex.get(session_id)
      if (!set) {
        set = new Set<string>()
        this.sessionIndex.set(session_id, set)
      }
      set.add(id)

      return { ...reservation }
    })
  }

  async releaseReservation(
    reservationId: string
  ): Promise<{ released: boolean; quantity: number }> {
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

  async confirmReservation(
    reservationId: string
  ): Promise<{ confirmed: boolean; quantity: number; reservation: ReservationRecord | null }> {
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

  async getAvailableStock(
    sessionId: string,
    variantId: string,
    nowMs: number
  ): Promise<StockAvailabilityInfo> {
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

  async getReservation(
    reservationId: string,
    nowMs: number
  ): Promise<ReservationRecord | null> {
    this.sweepExpiredMemoryReservations(nowMs)
    const record = this.reservations.get(reservationId)
    return record ? { ...record } : null
  }

  async listReservations(
    filter: ListReservationsFilter | undefined,
    nowMs: number
  ): Promise<ReservationRecord[]> {
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

  async releaseSessionReservations(sessionId: string): Promise<number> {
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

  async cleanupExpiredReservations(nowMs: number): Promise<number> {
    return this.sweepExpiredMemoryReservations(nowMs)
  }
}
