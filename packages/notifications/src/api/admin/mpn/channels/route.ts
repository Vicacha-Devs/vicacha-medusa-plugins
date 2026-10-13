import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATIONS_MODULE,
  SMS_DRIVERS,
  WHATSAPP_DRIVERS,
} from "../../../../modules/notifications/types"
import { isValidTelegramRecipient } from "../../../../modules/notifications/utils/security"
import { UpdateChannelConfigSchema } from "../../../middlewares"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const channels = []
  for (const ch of NOTIFICATION_CHANNELS) {
    const defaultDriver =
      ch === "whatsapp"
        ? process.env.WHATSAPP_DRIVER || "meta-cloud"
        : ch === "sms"
          ? process.env.SMS_DRIVER || "twilio"
          : ch === "email"
            ? "smtp"
            : ch === "dummy"
              ? "sandbox"
              : ch
    const cfg = await mpnService.getOrCreateChannelConfig(ch, defaultDriver)

    const envStatus: Record<string, boolean> = {}
    if (ch === "email") {
      envStatus.smtp_configured = Boolean(
        process.env.MAILER_SMTP_HOST && process.env.MAILER_SMTP_USER
      )
    } else if (ch === "whatsapp") {
      envStatus.meta_cloud_configured = Boolean(
        process.env.WHATSAPP_ACCESS_TOKEN &&
          process.env.WHATSAPP_PHONE_NUMBER_ID
      )
      envStatus.openwa_configured = Boolean(process.env.OPENWA_BASE_URL)
      envStatus.waha_configured = Boolean(process.env.WAHA_BASE_URL)
      envStatus.evolution_configured = Boolean(process.env.EVOLUTION_BASE_URL)
    } else if (ch === "telegram") {
      envStatus.bot_token_configured = Boolean(process.env.TELEGRAM_BOT_TOKEN)
    } else if (ch === "sms") {
      envStatus.twilio_configured = Boolean(
        process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
      )
      envStatus.signalhouse_configured = Boolean(
        process.env.SIGNALHOUSE_API_KEY
      )
      envStatus.msg91_configured = Boolean(process.env.MSG91_AUTH_KEY)
      envStatus.smsapi_configured = Boolean(process.env.SMSAPI_TOKEN)
    } else if (ch === "slack") {
      envStatus.webhook_configured = Boolean(process.env.SLACK_WEBHOOK_URL)
    }

    channels.push({
      ...cfg,
      env_status: envStatus,
    })
  }

  return res.json({
    success: true,
    channels,
    sender_profiles: mpnService.getSenderProfiles(),
    whatsapp_drivers: WHATSAPP_DRIVERS,
    sms_drivers: SMS_DRIVERS,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = UpdateChannelConfigSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid channel configuration payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const input = parsed.data

  if (
    input.channel === "telegram" &&
    input.config_json?.merchant_channel_id &&
    !isValidTelegramRecipient(String(input.config_json.merchant_channel_id))
  ) {
    return res.status(400).json({
      success: false,
      code: "INVALID_TELEGRAM_CHANNEL_ID",
      message:
        "Telegram channel ID must be a supergroup/channel ID (-100...), @channel_handle, or numeric chat_id.",
    })
  }

  let verifiedFlag: boolean | undefined = undefined
  let verificationResult: Record<string, any> | undefined = undefined

  if (input.action === "verify") {
    const targetRecipient =
      input.test_recipient ||
      (input.config_json?.merchant_channel_id as string) ||
      process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
      "sandbox-test"

    await mpnService.captureSandboxMessage({
      channel: input.channel,
      recipient: targetRecipient,
      subject: `Channel Verification (${input.channel})`,
      body: `✅ Medusa Notification Studio verification test succeeded for channel '${input.channel}' (${input.driver || "default"}).`,
    })

    verifiedFlag = true
    verificationResult = {
      verified: true,
      recipient: targetRecipient,
      verified_at: new Date().toISOString(),
    }
  }

  const updated = await mpnService.saveChannelConfig({
    channel: input.channel,
    driver: input.driver,
    is_enabled: input.is_enabled,
    is_verified: verifiedFlag,
    rate_limit_per_sec: input.rate_limit_per_sec,
    config_json: input.config_json as Record<string, any>,
  })

  return res.json({
    success: true,
    channel_config: updated,
    verification: verificationResult,
  })
}
