import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import type { CreateCountSessionBody } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService

  const sessions = await barcodeService.listBarcodeCountSessions(
    {},
    { take: 100 }
  )
  const items = await barcodeService.listBarcodeCountItems({}, { take: 1000 })

  const itemsBySession = new Map<string, typeof items>()
  for (const item of items) {
    const list = itemsBySession.get(item.session_id) || []
    list.push(item)
    itemsBySession.set(item.session_id, list)
  }

  const enriched = sessions.map((session) => ({
    ...session,
    items: itemsBySession.get(session.id) || [],
  }))

  res.json({
    sessions: enriched,
    count: enriched.length,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  const body = req.validatedBody as CreateCountSessionBody

  const created = await barcodeService.createStockCountSession(body)
  res.status(201).json(created)
}
