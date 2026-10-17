import {
  getRequestPayload,
  OAuthCallbackSchema,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"

async function handleOAuthCallback(
  req: HttpRequest,
  res: HttpResponse,
  rawPayload: unknown
): Promise<void> {
  try {
    const payload = parseWithMedusaError(OAuthCallbackSchema, rawPayload)
    const socialService = resolveSocialService(req)

    const account = await socialService.exchangeOAuthCallback({
      code: payload.code,
      state: payload.state,
      redirect_uri: payload.redirect_uri,
    })

    res.status(200).json({
      account,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleOAuthCallback(req, res, {
    code: req.query?.code,
    state: req.query?.state,
    redirect_uri: req.query?.redirect_uri,
  })
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  await handleOAuthCallback(req, res, getRequestPayload(req))
}
