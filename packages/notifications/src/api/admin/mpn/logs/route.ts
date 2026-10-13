import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../modules/notifications/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const filters: Record<string, any> = {}
  if (typeof req.query.channel === "string" && req.query.channel) {
    filters.channel = req.query.channel
  }
  if (typeof req.query.status === "string" && req.query.status) {
    filters.status = req.query.status
  }
  if (typeof req.query.entity_id === "string" && req.query.entity_id) {
    filters.entity_id = req.query.entity_id
  }
  if (typeof req.query.event_name === "string" && req.query.event_name) {
    filters.event_name = req.query.event_name
  }

  const limit = Math.min(
    100,
    Math.max(1, Number(req.query.limit || 50))
  )
  const offset = Math.max(0, Number(req.query.offset || 0))

  const allLogs = await mpnService.listMpnDeliveryLogs(filters)
  const sorted = [...allLogs].sort((a: any, b: any) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0
    return tB - tA
  })

  return res.json({
    success: true,
    logs: sorted.slice(offset, offset + limit),
    count: sorted.length,
    limit,
    offset,
  })
}
