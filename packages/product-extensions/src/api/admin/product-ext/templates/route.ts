import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type CreateAttributeTemplateInput,
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../modules/product-ext"
import { createTemplateWorkflow } from "../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const categoryId =
    typeof req.query.category_id === "string"
      ? req.query.category_id
      : undefined
  const isActive =
    typeof req.query.is_active === "string"
      ? req.query.is_active === "true"
      : undefined

  const templates = await service.listTemplates({
    category_id: categoryId,
    is_active: isActive,
  })

  return res.status(200).json({ templates })
}

export async function POST(
  req: MedusaRequest<CreateAttributeTemplateInput>,
  res: MedusaResponse
) {
  const { result } = await createTemplateWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  return res.status(201).json({ template: result })
}
