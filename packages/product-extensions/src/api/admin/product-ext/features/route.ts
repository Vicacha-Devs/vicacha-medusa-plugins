import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type CreateProductFeatureInput,
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../modules/product-ext"
import { createFeatureWorkflow } from "../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const isActive =
    typeof req.query.is_active === "string"
      ? req.query.is_active === "true"
      : undefined
  const features = await service.listFeatures({ is_active: isActive })
  return res.status(200).json({ features })
}

export async function POST(
  req: MedusaRequest<CreateProductFeatureInput>,
  res: MedusaResponse
) {
  const { result } = await createFeatureWorkflow(req.scope).run({
    input: req.validatedBody,
  })
  return res.status(201).json({ feature: result })
}
