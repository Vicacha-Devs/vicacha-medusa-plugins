import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService

  const caches = await barcodeService.listBarcodeCaches({}, { take: 200 })
  res.json({
    cache_entries: caches,
    count: caches.length,
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService

  const clearAll = req.query.all === "true"
  if (clearAll) {
    const all = await barcodeService.listBarcodeCaches({}, { take: 1000 })
    const ids = all.map((c) => c.id)
    if (ids.length > 0) {
      await barcodeService.deleteBarcodeCaches(ids)
    }
    res.json({ purged_count: ids.length })
    return
  }

  const result = await barcodeService.purgeExpiredCache()
  res.json(result)
}
