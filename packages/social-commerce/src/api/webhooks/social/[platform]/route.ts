import { createHash } from "node:crypto"
import {
  getRequestPayload,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import {
  MedusaError,
  timingSafeHexEqual,
  type SocialPlatform,
} from "../../../../modules/social-commerce/index.js"
import {
  liveEndedWorkflow,
  liveStartedWorkflow,
} from "../../../../workflows/index.js"

function validatePlatformParam(raw?: string): SocialPlatform {
  if (raw === "tiktok" || raw === "instagram" || raw === "facebook") {
    return raw
  }
  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Unsupported webhook platform "${String(raw)}". Expected tiktok, instagram, or facebook.`
  )
}

/**
 * Meta Graph API Webhook Verification (`GET /webhooks/social/instagram` or `facebook`).
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const platform = validatePlatformParam(req.params?.platform)
    const mode = req.query?.["hub.mode"]
    const token = String(req.query?.["hub.verify_token"] ?? "")
    const challenge = String(req.query?.["hub.challenge"] ?? "")

    const expectedVerifyToken =
      process.env.META_WEBHOOK_VERIFY_TOKEN ||
      process.env.META_WEBHOOK_SECRET ||
      ""

    if (mode !== "subscribe" || !expectedVerifyToken || !token) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `Webhook verification failed for ${platform}.`
      )
    }

    const actualHash = createHash("sha256").update(token).digest("hex")
    const expectedHash = createHash("sha256")
      .update(expectedVerifyToken)
      .digest("hex")

    if (!timingSafeHexEqual(actualHash, expectedHash)) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `Invalid webhook verify_token for ${platform}.`
      )
    }

    if (typeof res.send === "function") {
      res.status(200)
      res.send(challenge)
    } else {
      res.status(200).json({ challenge })
    }
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

/**
 * Receives HMAC-SHA256 signed webhook events from TikTok, Instagram, and Facebook.
 */
export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const platform = validatePlatformParam(req.params?.platform)
    const socialService = resolveSocialService(req)

    const headers = req.headers ?? {}
    const rawSignature =
      headers["x-hub-signature-256"] ||
      headers["x-tiktok-signature"] ||
      headers["x-social-signature"]
    const signature = Array.isArray(rawSignature)
      ? rawSignature[0]
      : rawSignature

    const bodyData = getRequestPayload(req)
    const rawBody =
      req.rawBody ??
      (typeof bodyData === "string" ? bodyData : JSON.stringify(bodyData ?? {}))

    await socialService.verifyWebhookSignature(platform, rawBody, signature)

    const payload = (
      typeof bodyData === "object" && bodyData !== null ? bodyData : {}
    ) as Record<string, unknown>

    const eventType = String(payload.event ?? payload.type ?? "")
    const sessionId =
      typeof payload.session_id === "string" ? payload.session_id : undefined

    if (eventType === "live.started" && sessionId) {
      await liveStartedWorkflow(req.scope).run({
        input: {
          session_id: sessionId,
          stream_url:
            typeof payload.stream_url === "string"
              ? payload.stream_url
              : undefined,
          platform_live_id:
            typeof payload.platform_live_id === "string"
              ? payload.platform_live_id
              : undefined,
        },
      })
      res.status(200).json({
        received: true,
        handled: true,
        platform,
        event: eventType,
        action: "live_session_started",
      })
      return
    }

    if (eventType === "live.ended" && sessionId) {
      await liveEndedWorkflow(req.scope).run({
        input: {
          session_id: sessionId,
        },
      })
      res.status(200).json({
        received: true,
        handled: true,
        platform,
        event: eventType,
        action: "live_session_ended",
      })
      return
    }

    const webhookResult = await socialService.handleIncomingWebhook(
      platform,
      payload
    )

    res.status(200).json({
      ...webhookResult,
      received: true,
      platform,
      event: eventType || webhookResult.event || "acknowledged",
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}


