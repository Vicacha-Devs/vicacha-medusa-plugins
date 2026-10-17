import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const resolved =
    req.query.resolved === "true"
      ? true
      : req.query.resolved === "false"
        ? false
        : undefined

  const filters: Record<string, unknown> = {}
  if (resolved !== undefined) filters.resolved = resolved

  const failures = await odooService.listErpSyncFailures(filters, { take: 100 })
  res.json({ failures })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as {
    id: string
    resolvedBy?: string
  }
  const failure = await odooService.resolveFailure(
    body.id,
    body.resolvedBy ?? "admin"
  )
  res.json({ ok: true, failure })
}
