import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { UpdateAttributeDefinitionInput } from "../../../../../modules/product-ext"
import {
  deleteAttributeWorkflow,
  updateAttributeWorkflow,
} from "../../../../../workflows"

export async function PATCH(
  req: MedusaRequest<Omit<UpdateAttributeDefinitionInput, "id">>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await updateAttributeWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })
  return res.status(200).json({ attribute: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { result } = await deleteAttributeWorkflow(req.scope).run({
    input: { id },
  })
  return res.status(200).json(result)
}
