import { randomUUID } from "node:crypto"
import { MedusaError } from "../utils/medusa-error"
import type {
  ReservationRecord,
  ReservationStatus,
  ReserveLiveStockInput,
  StockAvailabilityInfo,
} from "../types/index"
import { InMemoryReservationStore } from "./reservation/in-memory-reservation.store"
import { RedisReservationStore } from "./reservation/redis-reservation.store"
import type {
  RedisLikeClient,
  ReservationStoreBackend,
} from "./reservation/reservation-store.interface"

export type { RedisLikeClient, ReservationStoreBackend } from "./reservation/reservation-store.interface"
export { RedisReservationStore } from "./reservation/redis-reservation.store"
export { InMemoryReservationStore } from "./reservation/in-memory-reservation.store"

const DEFAULT_RESERVATION_TTL_SECONDS = 600 // 10 minutes

/**
 * Dual-mode Live Shopping Stock Reservation Engine.
 *
 * - **Redis Mode**: Uses atomic Lua scripts + session index sets (`SADD`/`SMEMBERS`)
 *   for distributed multi-instance flash-sale concurrency control without `KEYS *`.
 * - **In-Memory Fallback Mode**: Uses per-key async mutex locks + deterministic TTL
 *   sweeps so development and single-node deployments work with zero Redis setup.
 */
export class InventoryReservationService {
  private readonly store: ReservationStoreBackend
  private readonly defaultTtlSeconds: number

  constructor(options?: {
    redisClient?: RedisLikeClient | null
    defaultTtlSeconds?: number
    store?: ReservationStoreBackend
  }) {
    this.store =
      options?.store ??
      (options?.redisClient
        ? new RedisReservationStore(options.redisClient)
        : new InMemoryReservationStore())

    this.defaultTtlSeconds =
      options?.defaultTtlSeconds && options.defaultTtlSeconds > 0
        ? Math.floor(options.defaultTtlSeconds)
        : DEFAULT_RESERVATION_TTL_SECONDS
  }

  get mode(): "redis" | "memory" {
    return this.store.mode
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
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "session_id is required to initialize live stock."
      )
    }
    if (!variantId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "variant_id is required to initialize live stock."
      )
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Initial live stock quantity must be a non-negative integer."
      )
    }

    const normalizedQty = Math.floor(quantity)
    return this.store.initializeLiveStock(
      sessionId,
      variantId,
      normalizedQty,
      ttlSeconds
    )
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

    return this.store.reserveStock(reservation, ttl, nowMs)
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

    return this.store.releaseReservation(reservationId, sessionId, variantId)
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

    return this.store.confirmReservation(reservationId, sessionId, variantId)
  }

  /**
   * Returns current total, reserved, and available stock for a variant in a live session.
   */
  async getAvailableStock(
    sessionId: string,
    variantId: string,
    nowMs: number = Date.now()
  ): Promise<StockAvailabilityInfo> {
    return this.store.getAvailableStock(sessionId, variantId, nowMs)
  }

  /**
   * Retrieves a reservation by ID.
   */
  async getReservation(
    reservationId: string,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord | null> {
    return this.store.getReservation(reservationId, nowMs)
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
    return this.store.listReservations(filter, nowMs)
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

    return this.store.releaseSessionReservations(sessionId)
  }

  /**
   * Sweeps expired reservations across all sessions and returns the number of
   * expired reservations reclaimed.
   */
  async cleanupExpiredReservations(nowMs: number = Date.now()): Promise<number> {
    return this.store.cleanupExpiredReservations(nowMs)
  }
}
