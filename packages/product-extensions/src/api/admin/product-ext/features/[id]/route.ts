import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { UpdateProductFeatureInput } from "../../../../../modules/product-ext"
import {
  deleteFeatureWorkflow,
  updateFeatureWorkflow,
} from "../../../../../workflows"

export async function PATCH(
  req: MedusaRequest<Omit<UpdateProductFeatureInput, "id">>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await updateFeatureWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })
  return res.status(200).json({ feature: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { result } = await deleteFeatureWorkflow(req.scope).run({
    input: { id },
  })
  return res.status(200).json(result)
}
