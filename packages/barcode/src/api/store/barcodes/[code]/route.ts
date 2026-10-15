import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE, type BarcodeSymbology } from "../../../../modules/barcode/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const code = req.params.code || ""
  const formatParam =
    typeof req.query.format === "string" ? req.query.format : "json"
  const symbologyParam =
    typeof req.query.symbology === "string"
      ? (req.query.symbology as BarcodeSymbology)
      : undefined

  const resolved = await barcodeService.resolveBarcodeScan(code)

  if (formatParam === "svg") {
    const svg =
      resolved.tag?.svg_markup ||
      (await barcodeService.renderSvg({
        code,
        symbology:
          symbologyParam ||
          (resolved.parsed.type === "unknown"
            ? "code128"
            : resolved.parsed.type),
      }))
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8")
    res.status(200).send(svg)
    return
  }

  res.json(resolved)
}
