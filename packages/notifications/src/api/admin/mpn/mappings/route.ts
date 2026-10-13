import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import {
  NOTIFICATIONS_MODULE,
  RECIPIENT_RULES,
  SUPPORTED_EVENTS,
} from "../../../../modules/notifications/types"
import { UpsertEventMappingSchema } from "../../../middlewares"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const query: Record<string, any> = {}
  if (typeof req.query.event_name === "string") {
    query.event_name = req.query.event_name
  }
  if (typeof req.query.channel === "string") {
    query.channel = req.query.channel
  }

  const mappings = await mpnService.listMpnEventMappings(query)
  return res.json({
    success: true,
    mappings,
    supported_events: SUPPORTED_EVENTS,
    recipient_rules: RECIPIENT_RULES,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = UpsertEventMappingSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid event mapping payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const data = parsed.data

  const created = await mpnService.createMpnEventMappings({
    event_name: data.event_name,
    channel: data.channel,
    template_id: data.template_id,
    recipient_rule: data.recipient_rule,
    custom_recipient: data.custom_recipient ?? null,
    sender_profile_index: data.sender_profile_index ?? 1,
    telegram_thread_id: data.telegram_thread_id ?? null,
    attach_document_types: (data.attach_document_types as any) ?? null,
    variable_map: data.variable_map ?? null,
    conditions: (data.conditions as any) ?? null,
    is_active: data.is_active ?? true,
    priority: data.priority ?? 0,
  })

  return res.status(201).json({
    success: true,
    mapping: created,
  })
}
