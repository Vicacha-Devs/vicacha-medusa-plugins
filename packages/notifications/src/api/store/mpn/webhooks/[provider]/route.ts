import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../../modules/notifications/types"
import { verifyWebhookHmacSignature } from "../../../../../modules/notifications/utils/security"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const provider = (req.params.provider || "").toLowerCase()
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  // Verify webhook signature when signing secret is configured
  const signingSecret =
    provider === "signalhouse"
      ? process.env.SIGNALHOUSE_WEBHOOK_SIGNING_SECRET
      : provider === "telegram"
        ? process.env.TELEGRAM_WEBHOOK_SECRET
        : process.env.MPN_WEBHOOK_SIGNING_SECRET

  if (signingSecret) {
    if (provider === "telegram") {
      const tgSecretHeader = req.headers["x-telegram-bot-api-secret-token"]
      if (tgSecretHeader !== signingSecret) {
        return res.status(401).json({
          success: false,
          code: "INVALID_WEBHOOK_SIGNATURE",
          message: "Telegram webhook secret token mismatch",
        })
      }
    } else {
      const rawBody =
        (req as any).rawBody || JSON.stringify(req.body || {})
      const sigHeader =
        (req.headers["x-signalhouse-signature"] as string) ||
        (req.headers["x-webhook-signature"] as string) ||
        (req.headers["x-hub-signature-256"] as string)
      if (!verifyWebhookHmacSignature(rawBody, sigHeader, signingSecret)) {
        return res.status(401).json({
          success: false,
          code: "INVALID_WEBHOOK_SIGNATURE",
          message: "Webhook HMAC signature verification failed",
        })
      }
    }
  }

  const body = (req.body || {}) as Record<string, any>

  // 1. Telegram Bot `/start <customer_id>` deep-link opt-in & chat_id linking
  if (provider === "telegram" && body.message?.text) {
    const chatId = String(body.message.chat?.id || "")
    const text = String(body.message.text || "").trim()
    if (chatId && text.startsWith("/start")) {
      const tokenArg = text.split(/\s+/)[1] || null
      const record = await mpnService.upsertConsent({
        identifier: chatId,
        channel: "telegram",
        customer_id: tokenArg,
        action: "opt_in",
        source: "telegram_bot_start",
        metadata: {
          username: body.message.from?.username || null,
        },
      })
      return res.json({
        success: true,
        action: "telegram_linked",
        consent_id: record.id,
      })
    }
  }

  // 2. Inbound SMS / WhatsApp JOIN / STOP keyword handling (Signal House, Twilio, OpenWA/WAHA)
  const fromPhone =
    body.from || body.From || body.data?.from || body.sender || ""
  const messageText =
    body.text || body.Body || body.message || body.data?.body || ""

  if (fromPhone && messageText) {
    const channel =
      provider === "whatsapp" || provider === "openwa" || provider === "waha"
        ? "whatsapp"
        : "sms"
    const result = await mpnService.processInboundConsentKeyword({
      from: String(fromPhone),
      body: String(messageText),
      channel,
    })

    return res.json({
      success: true,
      ...result,
    })
  }

  return res.json({
    success: true,
    handled: false,
  })
}
