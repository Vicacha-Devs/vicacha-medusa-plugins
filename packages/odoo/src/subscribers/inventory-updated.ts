import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type OdooModuleService from "../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooInventorySyncSettings,
} from "../modules/odoo/types"

export default async function odooInventoryUpdatedSubscriber({
  container,
}: SubscriberArgs<{ id?: string }>) {
  try {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const settings =
      await odooService.getSectionSettings<OdooInventorySyncSettings>(
        "inventory"
      )
    if (
      settings.enableStock &&
      (settings.direction === "medusa_to_odoo" ||
        settings.direction === "bidirectional")
    ) {
      await odooService.exportInventoryToOdoo(container, undefined, "event")
    }
  } catch {
    // Non-blocking subscriber
  }
}

export const config: SubscriberConfig = {
  event: "inventory-level.updated",
  context: {
    subscriberId: "odoo-inventory-updated-subscriber",
  },
}
