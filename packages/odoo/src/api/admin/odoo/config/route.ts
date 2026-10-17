import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooConnectionConfig,
} from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const config = await odooService.getRedactedConnectionConfig()
  res.json({ config })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as Partial<OdooConnectionConfig>
  const config = await odooService.saveConnectionConfig(body)
  res.json({ ok: true, config })
}
