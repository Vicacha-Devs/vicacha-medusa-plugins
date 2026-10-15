import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const rawBarcode = req.params.barcode || ""
  const parsed = await barcodeService.parseAndValidateBarcode(rawBarcode)

  const [products, tags, svg] = await Promise.all([
    barcodeService.listBarcodeProducts(
      { barcode: parsed.normalized },
      { take: 1 }
    ),
    barcodeService.listBarcodeTags({ code: parsed.normalized }, { take: 1 }),
    barcodeService.renderSvg({
      code: parsed.normalized,
      symbology: parsed.type === "unknown" ? "code128" : parsed.type,
    }),
  ])

  res.json({
    barcode: parsed.normalized,
    parsed,
    barcode_product: products[0] || null,
    tag: tags[0] || null,
    svg,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const rawBarcode = req.params.barcode || ""
  const parsed = await barcodeService.parseAndValidateBarcode(rawBarcode)

  const [products, caches] = await Promise.all([
    barcodeService.listBarcodeProducts(
      { barcode: parsed.normalized },
      { take: 20 }
    ),
    barcodeService.listBarcodeCaches(
      { barcode: parsed.normalized },
      { take: 20 }
    ),
  ])

  if (products.length > 0) {
    await barcodeService.deleteBarcodeProducts(products.map((p) => p.id))
  }
  if (caches.length > 0) {
    await barcodeService.deleteBarcodeCaches(caches.map((c) => c.id))
  }

  res.json({
    deleted: true,
    barcode: parsed.normalized,
    deleted_products: products.length,
    deleted_caches: caches.length,
  })
}
