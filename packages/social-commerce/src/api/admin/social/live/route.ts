import {
  CreateLiveSessionSchema,
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type {
  LiveSessionStatus,
  SocialPlatform,
} from "../../../../modules/social-commerce/types/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const platform = req.query?.platform as SocialPlatform | undefined
    const status = req.query?.status as LiveSessionStatus | undefined
    const socialAccountId = req.query?.social_account_id as string | undefined

    const sessions = await socialService.listLiveSessionsWithStock({
      platform,
      status,
      social_account_id: socialAccountId,
    })

    res.status(200).json({
      sessions,
      count: sessions.length,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      CreateLiveSessionSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)
    const session = await socialService.scheduleLiveSession(body)
    res.status(201).json({ session })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
