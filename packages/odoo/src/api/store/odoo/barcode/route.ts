import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooBarcodeContext,
} from "../../../../modules/odoo/types"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as {
    barcode: string
    context?: OdooBarcodeContext
  }

  const result = await odooService.resolveBarcode({
    barcode: body.barcode,
    context: body.context ?? "pos",
  })

  res.status(result.found ? 200 : 404).json(result)
}
