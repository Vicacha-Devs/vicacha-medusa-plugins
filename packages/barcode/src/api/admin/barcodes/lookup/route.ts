import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import type { LookupBarcodeBody } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const body = req.validatedBody as LookupBarcodeBody

  const result = await barcodeService.lookupBarcode(body.barcode, {
    skipCache: body.skipCache,
    strategy: body.strategy,
    providers: body.providers,
  })

  res.json(result)
}
