import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../modules/barcode/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService

  const productId =
    typeof req.query.product_id === "string" ? req.query.product_id : undefined
  const filter = productId ? { product_id: productId } : {}

  const [barcodeProducts, overview] = await Promise.all([
    barcodeService.listBarcodeProducts(filter, { take: 200 }),
    barcodeService.getAnalyticsOverview(),
  ])

  res.json({
    barcodes: barcodeProducts,
    count: barcodeProducts.length,
    overview,
  })
}
