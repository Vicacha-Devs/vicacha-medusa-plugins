import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  PRODUCT_EXT_MODULE,
  type ProductExtModuleService,
} from "../modules/product-ext"
import { applyAttributeTemplateWorkflow } from "../workflows"

export default async function productCreatedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; category_ids?: string[] }>) {
  try {
    const productId = event.data?.id
    if (!productId) {
      return
    }

    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const existing = await service.getByProductId(productId)
    if (existing?.template_id) {
      return
    }

    const categoryIds = event.data?.category_ids ?? []
    if (categoryIds.length === 0) {
      return
    }

    const templates = await service.listTemplates({ is_active: true })
    const matchingTemplate = templates.find((tpl) =>
      tpl.category_ids.some((catId) => categoryIds.includes(catId))
    )

    if (matchingTemplate) {
      await applyAttributeTemplateWorkflow(container).run({
        input: {
          product_id: productId,
          template_id_or_code: matchingTemplate.id,
        },
      })
    }
  } catch {
    // Non-fatal subscriber execution
  }
}

export const config: SubscriberConfig = {
  event: ["product.created"],
}
