import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const entityType =
    typeof req.query.entity_type === "string"
      ? req.query.entity_type
      : undefined

  const filters: Record<string, unknown> = {}
  if (entityType) filters.entity_type = entityType

  const [syncLogs, reconciliationLogs, snapshots] = await Promise.all([
    odooService.listErpSyncLogs(filters, { take: 100 }),
    odooService.listErpReconciliationLogs({}, { take: 50 }),
    odooService.listErpInventorySnapshots({}, { take: 100 }),
  ])

  res.json({
    logs: syncLogs,
    reconciliationLogs,
    snapshots,
  })
}
