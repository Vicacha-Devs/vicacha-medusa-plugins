import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status

  const conflicts = await odooService.listErpConflictResolutions(filters, {
    take: 100,
  })
  res.json({ conflicts })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as {
    id: string
    resolution: "odoo_wins" | "medusa_wins" | "custom"
    customValue?: unknown
    resolvedBy?: string
  }
  const conflict = await odooService.resolveConflict({
    ...body,
    scope: req.scope,
  })
  res.json({ ok: true, conflict })
}
