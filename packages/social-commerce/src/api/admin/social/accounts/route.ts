import {
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type {
  SocialAccountStatus,
  SocialPlatform,
} from "../../../../modules/social-commerce/types/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const platform = req.query?.platform as SocialPlatform | undefined
    const status = req.query?.status as SocialAccountStatus | undefined

    const accounts = await socialService.listAccounts({
      platform,
      status,
    })

    res.status(200).json({
      accounts,
      count: accounts.length,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
