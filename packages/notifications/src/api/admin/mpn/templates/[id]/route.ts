import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../../modules/notifications/types"
import { UpdateTemplateSchema } from "../../../../middlewares"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const id = req.params.id

  const result = await mpnService.getTemplateWithBlocks(id)
  if (!result) {
    return res.status(404).json({
      success: false,
      code: "NOT_FOUND",
      message: `Template '${id}' not found`,
    })
  }

  return res.json({
    success: true,
    template: result.template,
    blocks: result.blocks,
    flat_blocks: result.flatBlocks,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  if (id.startsWith("system_")) {
    return res.status(400).json({
      success: false,
      code: "SYSTEM_TEMPLATE_READONLY",
      message:
        "System templates are read-only. Clone the system preset to DB first.",
    })
  }

  const parsed = UpdateTemplateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid template update payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const { blocks, ...templateFields } = parsed.data

  const updated = await mpnService.updateMpnTemplates({
    id,
    ...templateFields,
  })

  if (Array.isArray(blocks)) {
    await mpnService.replaceTemplateBlocks(id, blocks)
  }

  const full = await mpnService.getTemplateWithBlocks(id)
  return res.json({
    success: true,
    template: full?.template || updated,
    blocks: full?.blocks || [],
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  if (id.startsWith("system_")) {
    return res.status(400).json({
      success: false,
      code: "SYSTEM_TEMPLATE_READONLY",
      message: "System templates cannot be deleted",
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const existingBlocks = await mpnService.listMpnTemplateBlocks({
    template_id: id,
  })
  if (existingBlocks.length > 0) {
    await mpnService.deleteMpnTemplateBlocks(
      existingBlocks.map((b: any) => b.id)
    )
  }
  await mpnService.deleteMpnTemplates([id])

  return res.json({
    success: true,
    deleted: id,
  })
}
