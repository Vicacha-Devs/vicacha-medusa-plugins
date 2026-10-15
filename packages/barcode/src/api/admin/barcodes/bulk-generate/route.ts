import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { bulkGenerateVariantBarcodesWorkflow } from "../../../../workflows"
import type { BulkGenerateBarcodesBody } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as BulkGenerateBarcodesBody
  const { result } = await bulkGenerateVariantBarcodesWorkflow(req.scope).run({
    input: body,
  })

  res.status(201).json(result)
}
