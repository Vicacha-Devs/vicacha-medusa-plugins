import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type OdooModuleService from "../modules/odoo/service"
import { ODOO_MODULE, type OdooProductSyncSettings } from "../modules/odoo/types"

export default async function odooProductUpdatedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const productId = event?.data?.id
  if (!productId) return

  try {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const settings =
      await odooService.getSectionSettings<OdooProductSyncSettings>("product")
    if (
      settings.enableProductSync &&
      (settings.direction === "medusa_to_odoo" ||
        settings.direction === "bidirectional")
    ) {
      if (event?.name === "product.deleted") {
        await odooService.archiveProductInOdoo(String(productId), "event")
        return
      }
      await odooService.exportProductsToOdoo(container, undefined, "event")
    }
  } catch {
    // Non-blocking subscriber
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
  context: {
    subscriberId: "odoo-product-updated-subscriber",
  },
}
