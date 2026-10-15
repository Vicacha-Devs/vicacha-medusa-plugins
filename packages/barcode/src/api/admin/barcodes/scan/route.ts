import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import type { QuickScanAdjustBody } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const body = req.validatedBody as QuickScanAdjustBody

  const resolved = await barcodeService.resolveBarcodeScan(body.barcode)
  const action = body.action || "lookup"
  const quantityDelta =
    action === "increment"
      ? body.quantity ?? 1
      : action === "decrement"
      ? -(body.quantity ?? 1)
      : body.quantity ?? 0

  res.json({
    ...resolved,
    inventory_action: action,
    quantity_delta: quantityDelta,
    location_id: body.location_id ?? null,
    scanned_at: new Date().toISOString(),
  })
}
