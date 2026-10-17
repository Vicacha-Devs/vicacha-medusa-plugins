import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../modules/product-ext"

export default async function productDeletedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; product_id?: string; variant_id?: string }>) {
  try {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )

    if (event.name === "product-variant.deleted") {
      const variantId = event.data?.variant_id || event.data?.id
      if (variantId) {
        await service.deleteByVariantId(variantId)
      }
      return
    }

    const productId = event.data?.product_id || event.data?.id
    if (productId) {
      await service.purgeProductData(productId)
    }
  } catch {
    // Non-fatal subscriber cleanup
  }
}

export const config: SubscriberConfig = {
  event: ["product.deleted", "product-variant.deleted"],
}
