import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import type { PrintLabelsBody } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const body = req.validatedBody as PrintLabelsBody

  const output = await barcodeService.renderLabels({
    template_id: body.template_id,
    items: body.items,
  })

  res.json(output)
}
