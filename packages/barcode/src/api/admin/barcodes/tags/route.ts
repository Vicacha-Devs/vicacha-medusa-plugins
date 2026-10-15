import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type { BarcodeModuleService } from "../../../../modules/barcode/service"
import { BARCODE_MODULE } from "../../../../modules/barcode/types"
import { generateBarcodeTagWorkflow } from "../../../../workflows"
import type { CreateBarcodeTagBody } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const barcodeService = req.scope.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService

  const productId =
    typeof req.query.product_id === "string" ? req.query.product_id : undefined
  const targetId =
    typeof req.query.target_id === "string" ? req.query.target_id : undefined

  const filter: Record<string, unknown> = {}
  if (productId) filter.product_id = productId
  if (targetId) filter.target_id = targetId

  const tags = await barcodeService.listBarcodeTags(filter, { take: 200 })
  res.json({
    tags,
    count: tags.length,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as CreateBarcodeTagBody
  const { result } = await generateBarcodeTagWorkflow(req.scope).run({
    input: body,
  })

  res.status(201).json({ tag: result })
}
