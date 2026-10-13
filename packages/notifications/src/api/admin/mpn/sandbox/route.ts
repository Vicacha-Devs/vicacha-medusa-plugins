import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type NotificationsModuleService from "../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../modules/notifications/types"
import {
  clearInMemorySandboxMessages,
  getInMemorySandboxMessages,
} from "../../../../providers/dummy-sandbox"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)))
  const offset = Math.max(0, Number(req.query.offset || 0))

  const dbMessages = await mpnService.listMpnSandboxMessages({})
  const memMessages = getInMemorySandboxMessages(limit, offset).messages

  const combined = [...dbMessages, ...memMessages]
  const seen = new Set<string>()
  const deduped = combined.filter((m: any) => {
    const key = m.id || `${m.recipient}_${m.body}_${m.created_at}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return res.json({
    success: true,
    messages: deduped.slice(offset, offset + limit),
    count: deduped.length,
  })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  clearInMemorySandboxMessages()
  const dbRows = await mpnService.listMpnSandboxMessages({})
  if (dbRows.length > 0) {
    await mpnService.deleteMpnSandboxMessages(dbRows.map((r: any) => r.id))
  }

  return res.json({
    success: true,
    cleared: dbRows.length,
  })
}
