import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const overview = await odooService.getStatusOverview()
  res.json(overview)
}
