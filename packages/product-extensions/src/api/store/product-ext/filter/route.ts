import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type AttributeFilterCriterion,
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../modules/product-ext"

export async function POST(
  req: MedusaRequest<{ criteria: AttributeFilterCriterion[] }>,
  res: MedusaResponse
) {
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const productIds = await service.filterProductIdsByAttributes(
    req.validatedBody.criteria
  )
  return res.status(200).json({ product_ids: productIds })
}
