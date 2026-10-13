import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import {
  NOTIFICATIONS_MODULE,
  type NotificationChannel,
} from "../../../../modules/notifications/types"
import { CreateOrCloneTemplateSchema } from "../../../middlewares"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const channel =
    typeof req.query.channel === "string"
      ? (req.query.channel as NotificationChannel)
      : undefined
  const source =
    typeof req.query.source === "string"
      ? (req.query.source as "system" | "db" | "external")
      : undefined
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : undefined

  const templates = await mpnService.listAllTemplates({
    channel,
    source,
    locale,
  })

  return res.json({
    templates,
    count: templates.length,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = CreateOrCloneTemplateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid template payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const input = parsed.data

  if (input.clone_from_preset_id) {
    const cloned = await mpnService.cloneSystemPresetToDb(
      input.clone_from_preset_id,
      {
        name: input.name,
        label: input.label,
        locale: input.locale,
      }
    )
    return res.status(201).json({
      success: true,
      template: cloned.template,
      blocks: cloned.blocks,
    })
  }

  const created = await mpnService.createMpnTemplates({
    name: input.name || `template-${Date.now()}`,
    label: input.label || input.name || "Untitled Template",
    description: input.description ?? null,
    channel: input.channel,
    mode: input.mode,
    locale: input.locale,
    subject: input.subject ?? null,
    raw_content: input.raw_content ?? null,
    variable_map: input.variable_map ?? null,
    meta_template_name: input.meta_template_name ?? null,
    meta_language_code: input.meta_language_code ?? null,
    styles: input.styles ?? null,
    is_active: input.is_active ?? true,
  })

  let blocksTree: any[] = []
  if (Array.isArray(input.blocks) && input.blocks.length > 0) {
    blocksTree = await mpnService.replaceTemplateBlocks(
      created.id,
      input.blocks
    )
  }

  return res.status(201).json({
    success: true,
    template: { ...created, source: "db" },
    blocks: blocksTree,
  })
}
