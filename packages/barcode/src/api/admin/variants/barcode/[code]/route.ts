import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../../modules/barcode/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const code = req.params.code || ""

  const resolved = await barcodeService.resolveBarcodeScan(code, {
    scope: req.scope,
    hydrateVariant: true,
  })

  if (!resolved.found) {
    res.status(404).json({
      message: `No variant or product found for barcode ${code}`,
      code: resolved.code,
    })
    return
  }

  res.json({
    code: resolved.code,
    parsed: resolved.parsed,
    found: resolved.found,
    variant_id: resolved.variant_id,
    product_id: resolved.product_id,
    variant: resolved.variant,
    product: resolved.product,
    tag: resolved.tag,
    barcode_product: resolved.barcode_product,
  })
}
