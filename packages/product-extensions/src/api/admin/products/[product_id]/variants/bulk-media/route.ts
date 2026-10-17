import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { BulkAssignVariantMediaByOptionInput } from "../../../../../../modules/product-ext"
import { bulkAssignVariantMediaByOptionWorkflow } from "../../../../../../workflows"

export async function POST(
  req: MedusaRequest<Omit<BulkAssignVariantMediaByOptionInput, "product_id">>,
  res: MedusaResponse
) {
  const { product_id } = req.params
  const body = req.validatedBody

  const { result } = await bulkAssignVariantMediaByOptionWorkflow(
    req.scope
  ).run({
    input: {
      product_id,
      ...body,
    },
  })

  return res.status(200).json({
    product_id,
    updated_variants: result,
  })
}
