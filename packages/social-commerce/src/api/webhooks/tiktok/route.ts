import {
  getRequestPayload,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../middlewares.js"

/**
 * GET /webhooks/tiktok
 * Handles TikTok webhook verification challenges (`challenge` query parameter).
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  const challenge =
    typeof req.query?.challenge === "string" ? req.query.challenge : undefined
  if (challenge) {
    if (typeof res.send === "function") {
      res.status(200)
      res.send(challenge)
    } else {
      res.status(200).json({ challenge })
    }
    return
  }
  res.status(200).json({ status: "ok", platform: "tiktok" })
}

/**
 * POST /webhooks/tiktok
 * Verifies TikTok HMAC-SHA256 signature (`x-tiktok-signature` / `tiktok-signature`)
 * and processes `user.video.publish` and `live.room.status_update` events.
 */
export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)

    const headers = req.headers ?? {}
    const rawSignature =
      headers["x-tiktok-signature"] ||
      headers["tiktok-signature"] ||
      headers["x-social-signature"]
    const signature = Array.isArray(rawSignature)
      ? rawSignature[0]
      : rawSignature

    const bodyData = getRequestPayload(req)
    const rawBody =
      req.rawBody ??
      (typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData ?? {}))

    await socialService.verifyWebhookSignature("tiktok", rawBody, signature)

    const payload = (
      typeof bodyData === "object" && bodyData !== null
        ? bodyData
        : JSON.parse(String(rawBody))
    ) as Record<string, unknown>

    const result = await socialService.handleIncomingWebhook("tiktok", payload)
    res.status(200).json({ ...result, received: true })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

