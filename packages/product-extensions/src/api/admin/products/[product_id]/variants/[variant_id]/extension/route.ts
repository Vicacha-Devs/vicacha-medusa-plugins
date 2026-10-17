import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
  type UpsertVariantExtensionInput,
} from "../../../../../../../modules/product-ext"
import { upsertVariantExtWorkflow } from "../../../../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id, variant_id } = req.params
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const ext = await service.getByVariantId(variant_id)

  return res.status(200).json({
    variant_id,
    product_id: ext?.product_id ?? product_id ?? null,
    thumbnail: ext?.thumbnail ?? null,
    images: ext?.images ?? [],
    videos: ext?.videos ?? [],
    media_items: ext?.media_items ?? [],
    option_signature: ext?.option_signature ?? null,
    swatch_color: ext?.swatch_color ?? null,
    swatch_image_url: ext?.swatch_image_url ?? null,
    metadata: ext?.metadata ?? null,
  })
}

export async function POST(
  req: MedusaRequest<Omit<UpsertVariantExtensionInput, "variant_id">>,
  res: MedusaResponse
) {
  const { product_id, variant_id } = req.params
  const body = req.validatedBody

  const { result } = await upsertVariantExtWorkflow(req.scope).run({
    input: {
      variant_id,
      product_id: body.product_id ?? product_id,
      ...body,
    },
  })

  return res.status(200).json(result)
}
