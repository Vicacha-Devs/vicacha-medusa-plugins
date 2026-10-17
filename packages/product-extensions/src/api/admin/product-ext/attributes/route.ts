import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type CreateAttributeDefinitionInput,
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../modules/product-ext"
import { createAttributeWorkflow } from "../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const categoryId =
    typeof req.query.category_id === "string"
      ? req.query.category_id
      : undefined
  const ancestorIds =
    typeof req.query.ancestor_category_ids === "string"
      ? req.query.ancestor_category_ids
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
  const isFilterable =
    typeof req.query.is_filterable === "string"
      ? req.query.is_filterable === "true"
      : undefined

  const attributes = await service.listAttributes({
    category_id: categoryId,
    ancestor_category_ids: ancestorIds,
    is_filterable: isFilterable,
  })

  return res.status(200).json({ attributes })
}

export async function POST(
  req: MedusaRequest<CreateAttributeDefinitionInput>,
  res: MedusaResponse
) {
  const { result } = await createAttributeWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  return res.status(201).json({ attribute: result })
}
