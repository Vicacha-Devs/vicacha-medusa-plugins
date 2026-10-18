import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type OdooModuleService from "../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooCustomerSyncSettings,
} from "../modules/odoo/types"

export default async function odooCustomerUpdatedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string }>) {
  const customerId = event?.data?.id
  if (!customerId) return

  try {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const settings =
      await odooService.getSectionSettings<OdooCustomerSyncSettings>(
        "customers"
      )
    if (
      settings.enableCustomerSync &&
      (settings.direction === "medusa_to_odoo" ||
        settings.direction === "bidirectional")
    ) {
      await odooService.syncCustomers({
        scope: container,
        customerIds: [String(customerId)],
        directionOverride: "medusa_to_odoo",
        trigger: "event",
      })
    }
  } catch {
    // Non-blocking subscriber
  }
}

export const config: SubscriberConfig = {
  event: ["customer.created", "customer.updated"],
  context: {
    subscriberId: "odoo-customer-updated-subscriber",
  },
}
