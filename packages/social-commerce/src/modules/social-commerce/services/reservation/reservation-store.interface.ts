import type {
  ReservationRecord,
  ReservationStatus,
  StockAvailabilityInfo,
} from "../../types/index"

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

export interface ListReservationsFilter {
  session_id?: string
  cart_id?: string
  status?: ReservationStatus
}

/**
 * Pluggable storage backend contract for live shopping stock reservations.
 */
export interface ReservationStoreBackend {
  readonly mode: "redis" | "memory"

  initializeLiveStock(
    sessionId: string,
    variantId: string,
    normalizedQuantity: number,
    ttlSeconds: number
  ): Promise<StockAvailabilityInfo>

  reserveStock(
    reservation: ReservationRecord,
    ttlSeconds: number,
    nowMs: number
  ): Promise<ReservationRecord>

  releaseReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ released: boolean; quantity: number }>

  confirmReservation(
    reservationId: string,
    sessionId?: string,
    variantId?: string
  ): Promise<{ confirmed: boolean; quantity: number; reservation: ReservationRecord | null }>

  getAvailableStock(
    sessionId: string,
    variantId: string,
    nowMs: number
  ): Promise<StockAvailabilityInfo>

  getReservation(
    reservationId: string,
    nowMs: number
  ): Promise<ReservationRecord | null>

  listReservations(
    filter: ListReservationsFilter | undefined,
    nowMs: number
  ): Promise<ReservationRecord[]>

  releaseSessionReservations(sessionId: string): Promise<number>

  cleanupExpiredReservations(nowMs: number): Promise<number>
}
