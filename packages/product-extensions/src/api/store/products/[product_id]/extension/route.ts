import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../../../../../modules/product-ext"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const variantIdsParam = req.query.variant_ids
  const variantIds =
    typeof variantIdsParam === "string" && variantIdsParam.length > 0
      ? variantIdsParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined

  const salesChannelId =
    typeof req.query.sales_channel_id === "string"
      ? req.query.sales_channel_id
      : undefined
  const locale =
    typeof req.query.locale === "string" ? req.query.locale : undefined

  const service = req.scope.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  const payload = await service.getStorefrontProductPayload({
    product_id,
    variant_ids: variantIds,
    sales_channel_id: salesChannelId,
    locale,
  })

  return res.status(200).json(payload)
}
