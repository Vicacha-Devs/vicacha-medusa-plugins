import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { resolveOrderDocumentAttachments } from "../../../../modules/notifications/integrations/documents-and-b2b-resolver"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import {
  NOTIFICATIONS_MODULE,
  type NotificationChannel,
} from "../../../../modules/notifications/types"
import {
  executeEventNotificationsDispatch,
  hydrateEntityContextData,
} from "../../../../workflows"
import { ManualSendSchema } from "../../../middlewares"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = ManualSendSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid manual send payload",
      details: parsed.error.flatten(),
    })
  }

  const input = parsed.data
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  // Mode 1: Trigger all active mappings for an event (e.g. from Order Widget "Trigger Event")
  if (input.event_name && !input.template_id) {
    const outcome = await executeEventNotificationsDispatch(req.scope, {
      event_name: input.event_name,
      event_data: {
        id: input.order_id || input.entity_id,
        order_id: input.order_id,
        ...(input.custom_data || {}),
      },
      force_send: true,
    })
    return res.json({
      success: true,
      mode: "event_dispatch",
      outcome,
    })
  }

  if (!input.template_id) {
    return res.status(400).json({
      success: false,
      code: "MISSING_TEMPLATE_OR_EVENT",
      message: "Provide either template_id or event_name",
    })
  }

  // Mode 2: Direct template send / resend to a specific recipient or order
  const hydrated = await hydrateEntityContextData(req.scope, {
    context_type: input.order_id ? "order" : undefined,
    entity_id: input.order_id || input.entity_id,
    event_data: input.custom_data || {},
    locale: input.locale,
  })

  const attachments =
    input.order_id &&
    Array.isArray(input.attach_document_types) &&
    input.attach_document_types.length > 0
      ? await resolveOrderDocumentAttachments(
          req.scope,
          input.order_id,
          input.attach_document_types
        )
      : []

  const rendered = await mpnService.renderTemplateById({
    template_id: input.template_id,
    data: {
      ...hydrated.transformedData,
      ...(input.custom_data || {}),
    },
    locale: input.locale,
    telegram_thread_id: input.telegram_thread_id,
    attachments,
  })

  const channel: NotificationChannel = input.channel || rendered.channel
  const recipient =
    input.recipient?.trim() ||
    mpnService.resolveRecipientForRule({
      rule: "customer_auto",
      channel,
      data: hydrated.transformedData,
    }) ||
    "sandbox-recipient"

  let externalId = `manual_${channel}_${Date.now()}`
  try {
    const notificationModule = req.scope.resolve(Modules.NOTIFICATION) as any
    if (
      notificationModule &&
      typeof notificationModule.createNotifications === "function"
    ) {
      const notifRes = await notificationModule.createNotifications({
        to: recipient,
        channel,
        template: rendered.template_name,
        content: {
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        },
        data: {
          ...hydrated.transformedData,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          blocks_json: rendered.blocks_json,
          telegram_options: rendered.telegram_options,
          whatsapp_options: rendered.whatsapp_options,
          sms_options: rendered.sms_options,
        },
        attachments: rendered.attachments,
      })
      if (notifRes?.id) externalId = String(notifRes.id)
    }
  } catch {
    // Always capture in Sandbox so Admin test sends are inspectable even without live credentials
  }

  await mpnService.captureSandboxMessage({
    channel,
    recipient,
    subject: rendered.subject,
    body: rendered.text,
    html: rendered.html,
    attachments_meta: rendered.attachments?.map((a) => ({
      filename: a.filename,
      content_type: a.content_type,
    })),
  })

  const logEntry = await mpnService.recordDeliveryLog({
    idempotency_key: `manual:${Date.now()}:${channel}:${rendered.template_id}:${recipient}`,
    event_name: input.event_name || "manual.send",
    entity_id: input.order_id || input.entity_id || hydrated.entityId,
    channel,
    template_id: rendered.template_id,
    recipient,
    status: "sent",
    external_message_id: externalId,
    payload: rendered,
  })

  return res.json({
    success: true,
    mode: "direct_template_send",
    external_message_id: externalId,
    log: logEntry,
    rendered,
  })
}
