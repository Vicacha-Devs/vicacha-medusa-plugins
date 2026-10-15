import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type NotificationsModuleService from "../../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../../modules/notifications/types"
import { UpsertEventMappingSchema } from "../../../../validators"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  const parsed = UpsertEventMappingSchema.partial().safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid mapping update payload",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const updated = await mpnService.updateMpnEventMappings({
    id,
    ...(parsed.data as any),
  })

  return res.json({
    success: true,
    mapping: updated,
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params.id
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  await mpnService.deleteMpnEventMappings([id])
  return res.json({
    success: true,
    deleted: id,
  })
}
