import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import {
  NOTIFICATIONS_MODULE,
  type NotificationChannel,
} from "../../../../modules/notifications/types"
import { CreateBroadcastSchema } from "../../../middlewares"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const broadcasts = await mpnService.listMpnBroadcastCampaigns({})
  const consents = await mpnService.listMpnConsentRecords({})

  const optedInSms = consents.filter(
    (c: any) => c.channel === "sms" && c.status === "opted_in"
  ).length
  const optedInWhatsApp = consents.filter(
    (c: any) => c.channel === "whatsapp" && c.status === "opted_in"
  ).length
  const optedInTelegram = consents.filter(
    (c: any) => c.channel === "telegram" && c.status === "opted_in"
  ).length
  const optedOutCount = consents.filter(
    (c: any) => c.status === "opted_out"
  ).length

  return res.json({
    success: true,
    broadcasts,
    consent_summary: {
      total_records: consents.length,
      opted_in_sms: optedInSms,
      opted_in_whatsapp: optedInWhatsApp,
      opted_in_telegram: optedInTelegram,
      opted_out_total: optedOutCount,
    },
    consent_records: consents.slice(0, 50),
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = CreateBroadcastSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid broadcast campaign payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const input = parsed.data

  // Collect opted-in recipients for the selected channel
  const optedInRows = await mpnService.listMpnConsentRecords({
    channel: input.channel,
    status: "opted_in",
  })

  const recipients =
    Array.isArray(input.custom_recipients) && input.custom_recipients.length > 0
      ? input.custom_recipients
      : optedInRows.map((r: any) => r.identifier)

  let sentCount = 0
  let failedCount = 0

  if (input.send_now) {
    for (const recipient of recipients) {
      // Re-verify consent immediately before each send (@signalhouse-sms pattern)
      const check = await mpnService.verifyRecipientConsent({
        recipient,
        channel: input.channel as NotificationChannel,
        requireExplicitOptIn:
          input.channel === "sms" || input.channel === "whatsapp",
      })
      if (!check.allowed) {
        failedCount++
        continue
      }

      try {
        const rendered = await mpnService.renderTemplateById({
          template_id: input.template_id,
          append_sms_consent_footer: check.appendStopFooter,
        })
        await mpnService.captureSandboxMessage({
          channel: input.channel as NotificationChannel,
          recipient,
          subject: rendered.subject || input.name,
          body: rendered.text,
          html: rendered.html,
        })
        sentCount++
      } catch {
        failedCount++
      }
    }
  }

  const campaign = await mpnService.createMpnBroadcastCampaigns({
    name: input.name,
    channel: input.channel,
    template_id: input.template_id,
    customer_group_id: input.customer_group_id ?? null,
    custom_recipients: (input.custom_recipients as any) ?? null,
    status: input.send_now
      ? "completed"
      : input.scheduled_at
        ? "scheduled"
        : "draft",
    scheduled_at: input.scheduled_at ? new Date(input.scheduled_at) : null,
    sent_at: input.send_now ? new Date() : null,
    total_recipients: recipients.length,
    sent_count: sentCount,
    failed_count: failedCount,
  })

  return res.status(201).json({
    success: true,
    broadcast: campaign,
  })
}
