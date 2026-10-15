import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../../modules/barcode/types"
import type { UpdateBarcodeTagBody } from "../../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const id = req.params.id || ""
  const rows = await barcodeService.listBarcodeTags({ id }, { take: 1 })
  if (!rows[0]) {
    res.status(404).json({ message: `BarcodeTag ${id} not found` })
    return
  }
  res.json({ tag: rows[0] })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const id = req.params.id || ""
  const body = req.validatedBody as UpdateBarcodeTagBody

  const updated = await barcodeService.updateBarcodeTags({
    id,
    ...body,
  })
  res.json({ tag: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const id = req.params.id || ""
  await barcodeService.deleteBarcodeTags([id])
  res.json({ id, object: "barcode_tag", deleted: true })
}
