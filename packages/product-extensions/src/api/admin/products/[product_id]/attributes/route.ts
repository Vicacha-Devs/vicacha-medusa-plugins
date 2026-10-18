import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtensionDTO,
  type ProductExtModuleService,
  type ResolvedProductAttributeEntry,
  type UpsertProductAttributeValueInput,
} from "../../../../../modules/product-ext"
import {
  applyAttributeTemplateWorkflow,
  setProductAttributesWorkflow,
} from "../../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : undefined
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const attributes = await service.getProductAttributeValues(
    product_id,
    locale
  )

  return res.status(200).json({
    product_id,
    attributes,
  })
}

export async function POST(
  req: MedusaRequest<{
    template_id_or_code?: string
    attributes?: UpsertProductAttributeValueInput[]
  }>,
  res: MedusaResponse
) {
  const { product_id } = req.params
  const body = req.validatedBody

  let appliedExtension: ProductExtensionDTO | null = null
  if (body.template_id_or_code) {
    const { result } = await applyAttributeTemplateWorkflow(req.scope).run({
      input: {
        product_id,
        template_id_or_code: body.template_id_or_code,
      },
    })
    appliedExtension = result
  }

  let attributesResult: ResolvedProductAttributeEntry[] | null = null
  if (body.attributes && body.attributes.length > 0) {
    const { result } = await setProductAttributesWorkflow(req.scope).run({
      input: {
        product_id,
        attributes: body.attributes,
      },
    })
    attributesResult = result
  } else {
    const service = req.scope.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    attributesResult = await service.getProductAttributeValues(product_id)
  }


  return res.status(200).json({
    product_id,
    extension: appliedExtension,
    attributes: attributesResult,
  })
}
