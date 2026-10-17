import {
  getRequestPayload,
  parseWithMedusaError,
  ReserveLiveStockSchema,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type { SocialPlatform } from "../../../../modules/social-commerce/types/index.js"

/**
 * Lists currently active (`status === "live"`) live shopping sessions with pinned products
 * and real-time flash-sale stock availability.
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const platform = req.query?.platform as SocialPlatform | undefined

    const sessions = await socialService.listLiveSessionsWithStock({
      platform,
      status: "live",
    })

    res.status(200).json({
      live_sessions: sessions,
      count: sessions.length,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

/**
 * Atomically reserves stock for a customer/cart during an active live shopping stream.
 */
export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      ReserveLiveStockSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)

    const reservation = await socialService.reserveLiveProductStock(body)
    res.status(201).json({
      reservation,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
