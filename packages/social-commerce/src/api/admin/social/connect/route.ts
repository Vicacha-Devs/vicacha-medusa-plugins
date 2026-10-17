import {
  ConnectSocialAccountSchema,
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      ConnectSocialAccountSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)

    const result = await socialService.buildOAuthConnectUrl({
      platform: body.platform,
      redirect_uri: body.redirect_uri,
      scopes: body.scopes,
    })

    res.status(200).json({
      auth_url: result.url,
      state: result.state,
      platform: result.platform,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
