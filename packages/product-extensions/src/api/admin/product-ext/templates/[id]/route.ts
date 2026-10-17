import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { UpdateAttributeTemplateInput } from "../../../../../modules/product-ext"
import {
  deleteTemplateWorkflow,
  updateTemplateWorkflow,
} from "../../../../../workflows"

export async function PATCH(
  req: MedusaRequest<Omit<UpdateAttributeTemplateInput, "id">>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { result } = await updateTemplateWorkflow(req.scope).run({
    input: {
      id,
      ...req.validatedBody,
    },
  })
  return res.status(200).json({ template: result })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const { result } = await deleteTemplateWorkflow(req.scope).run({
    input: { id },
  })
  return res.status(200).json(result)
}
