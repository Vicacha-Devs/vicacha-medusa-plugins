import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
  type UpsertProductExtensionInput,
} from "../../../../../modules/product-ext"
import { upsertProductExtWorkflow } from "../../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const ext = await service.getByProductId(product_id)

  return res.status(200).json({
    ...(ext ? { id: ext.id, created_at: ext.created_at, updated_at: ext.updated_at } : {}),
    product_id,
    videos: ext?.videos ?? [],
    tagline: ext?.tagline ?? null,
    media_items: ext?.media_items ?? [],
    models_3d: ext?.models_3d ?? [],
    attachments: ext?.attachments ?? [],
    image_alts: ext?.image_alts ?? [],
    content_tree: ext?.content_tree ?? null,
    content_diff: ext?.content_diff ?? null,
    template_id: ext?.template_id ?? null,
    feature_ids: ext?.feature_ids ?? [],
    option_metadata: ext?.option_metadata ?? [],
    storefront_overrides: ext?.storefront_overrides ?? [],
    seo_metadata: ext?.seo_metadata ?? null,
    metadata: ext?.metadata ?? null,
    extension: ext ?? null,
  })
}

export async function POST(
  req: MedusaRequest<Omit<UpsertProductExtensionInput, "product_id">>,
  res: MedusaResponse
) {
  const { product_id } = req.params
  const body = req.validatedBody

  const { result } = await upsertProductExtWorkflow(req.scope).run({
    input: {
      product_id,
      ...body,
    },
  })

  return res.status(200).json({
    ...result,
    extension: result,
  })
}
