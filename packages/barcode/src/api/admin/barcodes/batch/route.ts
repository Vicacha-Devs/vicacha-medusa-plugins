import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { batchBarcodeImportWorkflow } from "../../../../workflows"
import type { BatchBarcodeImportBody } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as BatchBarcodeImportBody
  const { result } = await batchBarcodeImportWorkflow(req.scope).run({
    input: body,
  })

  res.status(201).json(result)
}
