import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../../modules/barcode/types"
import type { VerifyStoreBarcodeBody } from "../../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const code = req.params.code || ""
  const sig =
    typeof req.query.sig === "string"
      ? req.query.sig
      : typeof req.query.signature === "string"
      ? req.query.signature
      : ""

  const result = await barcodeService.verifyAuthenticityToken(code, sig)
  res.status(result.valid ? 200 : 400).json(result)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const code = req.params.code || ""
  const body = req.validatedBody as VerifyStoreBarcodeBody

  const result = await barcodeService.verifyAuthenticityToken(
    code,
    body.signature
  )
  res.status(result.valid ? 200 : 400).json(result)
}
