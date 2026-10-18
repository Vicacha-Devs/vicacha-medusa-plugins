import { MedusaError } from "@medusajs/framework/utils"
import { sanitizeHttpUrl } from "../utils/security"
import type {
  AttachLiveProductInput,
  CreateLiveSessionInput,
  LiveProductRecord,
  LiveSessionRecord,
  LiveSessionStatus,
  ReservationRecord,
  ReserveLiveStockInput,
  SocialPlatform,
} from "../types/index"
import type { SocialCommerceRepository } from "./social-commerce.repository"
import type { InventoryReservationService } from "./inventory-reservation.service"

/**
 * Coordinates Live Shopping sessions, pinned live products, and flash-sale
 * inventory reservation pools.
 */
export class LiveShoppingService {
  private readonly repo: SocialCommerceRepository
  private readonly reservationService: InventoryReservationService

  constructor(
    repo: SocialCommerceRepository,
    reservationService: InventoryReservationService
  ) {
    this.repo = repo
    this.reservationService = reservationService
  }

  /**
   * Creates a scheduled or active Live Shopping session.
   */
  async scheduleLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionRecord> {
    const accountId = (input.social_account_id ?? input.account_id ?? "").trim()
    if (!accountId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "social_account_id is required to create a live session."
      )
    }
    if (!input.title?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "title is required to create a live session."
      )
    }

    const account = await this.repo.retrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }

    const platformLiveId = input.platform_live_id ?? input.external_id ?? null

    return this.repo.createLiveSession({
      social_account_id: account.id,
      account_id: account.id,
      platform: input.platform ?? account.platform,
      platform_live_id: platformLiveId,
      external_id: platformLiveId,
      title: input.title.trim(),
      description: input.description ?? null,
      stream_url: input.stream_url ? sanitizeHttpUrl(input.stream_url) : null,
      playback_url: input.playback_url ? sanitizeHttpUrl(input.playback_url) : null,
      status: "scheduled",
      scheduled_at: input.scheduled_at ? new Date(input.scheduled_at) : null,
      started_at: null,
      ended_at: null,
      viewer_count: 0,
      peak_viewer_count: 0,
      metadata: input.metadata ?? null,
    })
  }

  /**
   * Attaches or updates products in a live session and initializes flash-sale stock
   * if the session is currently `live`.
   */
  async pinProductsToLiveSession(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<LiveProductRecord[]> {
    const session = await this.repo.retrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }
    if (!Array.isArray(products) || products.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one product must be provided to attach to a live session."
      )
    }

    const existingProducts = await this.repo.listLiveProducts({
      live_session_id: sessionId,
    })
    const results: LiveProductRecord[] = []

    for (const item of products) {
      if (!item.product_id?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Each live product requires a non-empty product_id."
        )
      }

      const variantId = item.variant_id?.trim() || item.product_id.trim()
      const match = existingProducts.find(
        (p) =>
          p.product_id === item.product_id.trim() &&
          (p.variant_id || p.product_id) === variantId
      )

      const livePrice = item.live_price ?? item.special_price
      const liveStock = item.live_stock ?? item.allocated_stock

      let record: LiveProductRecord
      if (match) {
        const nextPrice = livePrice ?? match.live_price
        const nextStock = liveStock !== undefined ? liveStock : match.live_stock
        const nextPinnedAt = item.is_pinned ? new Date() : match.pinned_at
        record = await this.repo.updateLiveProduct(match.id, {
          variant_id: item.variant_id?.trim() || null,
          live_price: nextPrice,
          special_price: nextPrice,
          currency_code: item.currency_code ?? match.currency_code,
          live_stock: nextStock,
          allocated_stock: nextStock,
          sort_order: item.sort_order ?? match.sort_order,
          pinned_at: nextPinnedAt,
          is_pinned: item.is_pinned !== undefined ? item.is_pinned : match.is_pinned,
          metadata: item.metadata ?? match.metadata,
        })
      } else {
        const resolvedPrice = livePrice ?? null
        const resolvedStock = liveStock ?? null
        record = await this.repo.createLiveProduct({
          live_session_id: sessionId,
          product_id: item.product_id.trim(),
          variant_id: item.variant_id?.trim() || null,
          live_price: resolvedPrice,
          special_price: resolvedPrice,
          currency_code: item.currency_code ?? null,
          live_stock: resolvedStock,
          allocated_stock: resolvedStock,
          reserved_quantity: 0,
          reserved_stock: 0,
          sold_quantity: 0,
          sold_stock: 0,
          pinned_at: item.is_pinned ? new Date() : null,
          is_pinned: Boolean(item.is_pinned),
          sort_order: item.sort_order ?? 0,
          metadata: item.metadata ?? null,
        })
      }

      if (session.status === "live" && typeof record.live_stock === "number") {
        await this.reservationService.initializeLiveStock(
          sessionId,
          record.variant_id || record.product_id,
          record.live_stock
        )
      }

      results.push(record)
    }

    return results
  }

  /**
   * Transitions a live session to `live` status and initializes atomic stock pools
   * for all attached `LiveProduct` items.
   */
  async startLiveSession(
    sessionId: string,
    options?: { stream_url?: string; platform_live_id?: string; external_id?: string }
  ): Promise<LiveSessionRecord> {
    const session = await this.repo.retrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }

    const platformLiveId =
      options?.platform_live_id ?? options?.external_id ?? session.platform_live_id

    const updated = await this.repo.updateLiveSession(sessionId, {
      status: "live",
      started_at: session.started_at ?? new Date(),
      stream_url: options?.stream_url
        ? sanitizeHttpUrl(options.stream_url)
        : session.stream_url,
      platform_live_id: platformLiveId,
      external_id: platformLiveId,
    })

    const liveProducts = await this.repo.listLiveProducts({
      live_session_id: sessionId,
    })
    for (const lp of liveProducts) {
      if (typeof lp.live_stock === "number" && lp.live_stock >= 0) {
        await this.reservationService.initializeLiveStock(
          sessionId,
          lp.variant_id || lp.product_id,
          lp.live_stock
        )
      }
    }

    return updated
  }

  /**
   * Ends a live session and releases all unconfirmed held reservations back to the pool.
   */
  async endLiveSession(
    sessionId: string
  ): Promise<{ session: LiveSessionRecord; released_reservations: number }> {
    const session = await this.repo.retrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }

    const releasedCount =
      await this.reservationService.releaseSessionReservations(sessionId)

    const updated = await this.repo.updateLiveSession(sessionId, {
      status: "ended",
      ended_at: new Date(),
    })

    return {
      session: updated,
      released_reservations: releasedCount,
    }
  }

  /**
   * Lists live sessions with their attached products and real-time stock availability.
   */
  async listLiveSessionsWithStock(filters?: {
    platform?: SocialPlatform
    status?: LiveSessionStatus
    social_account_id?: string
  }): Promise<
    Array<
      LiveSessionRecord & {
        products: Array<
          LiveProductRecord & {
            stock_availability: { total: number; reserved: number; available: number }
          }
        >
      }
    >
  > {
    const sessions = await this.repo.listLiveSessions(
      filters as Record<string, unknown> | undefined
    )

    return Promise.all(
      sessions.map(async (session) => {
        const products = await this.repo.listLiveProducts({
          live_session_id: session.id,
        })
        products.sort((a, b) => a.sort_order - b.sort_order)

        const enrichedProducts = await Promise.all(
          products.map(async (p) => {
            const keyVariantId = p.variant_id || p.product_id
            const availability =
              session.status === "live" && typeof p.live_stock === "number"
                ? await this.reservationService.getAvailableStock(
                    session.id,
                    keyVariantId
                  )
                : {
                    total: p.live_stock ?? 0,
                    reserved: p.reserved_quantity,
                    available: Math.max(0, (p.live_stock ?? 0) - p.reserved_quantity),
                  }
            return {
              ...p,
              stock_availability: availability,
            }
          })
        )

        return {
          ...session,
          products: enrichedProducts,
        }
      })
    )
  }

  /**
   * Reserves flash-sale stock during an active live session.
   */
  async reserveLiveProductStock(
    input: ReserveLiveStockInput,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord> {
    const session = await this.repo.retrieveLiveSession(input.session_id)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${input.session_id}" was not found.`
      )
    }
    if (session.status !== "live") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot reserve stock because LiveSession "${input.session_id}" is currently "${session.status}".`
      )
    }

    const reservation = await this.reservationService.reserveStock(input, nowMs)

    const liveProducts = await this.repo.listLiveProducts({
      live_session_id: input.session_id,
      product_id: input.product_id,
    })
    const matching = liveProducts.find(
      (lp) => (lp.variant_id || lp.product_id) === input.variant_id
    )
    if (matching) {
      const stockInfo = await this.reservationService.getAvailableStock(
        input.session_id,
        input.variant_id,
        nowMs
      )
      await this.repo.updateLiveProduct(matching.id, {
        reserved_quantity: stockInfo.reserved,
        reserved_stock: stockInfo.reserved,
      })
    }

    return reservation
  }

  /**
   * Confirms a held live reservation when an order is placed (`order.placed` subscriber).
   */
  async confirmLiveProductReservation(reservationId: string): Promise<{
    confirmed: boolean
    quantity: number
    reservation: ReservationRecord | null
  }> {
    const result = await this.reservationService.confirmReservation(reservationId)
    if (result.confirmed && result.reservation) {
      const liveProducts = await this.repo.listLiveProducts({
        live_session_id: result.reservation.session_id,
        product_id: result.reservation.product_id,
      })
      const matching = liveProducts.find(
        (lp) =>
          (lp.variant_id || lp.product_id) === result.reservation?.variant_id
      )
      if (matching) {
        const stockInfo = await this.reservationService.getAvailableStock(
          result.reservation.session_id,
          result.reservation.variant_id
        )
        const nextSold = matching.sold_quantity + result.quantity
        await this.repo.updateLiveProduct(matching.id, {
          reserved_quantity: stockInfo.reserved,
          reserved_stock: stockInfo.reserved,
          sold_quantity: nextSold,
          sold_stock: nextSold,
        })
      }
    }
    return result
  }
}
