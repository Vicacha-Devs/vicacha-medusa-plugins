import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { executeOrderSyncToOdoo } from "../workflows"

export default async function odooOrderPlacedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const orderId = event?.data?.id || event?.data?.order_id
  if (!orderId) return

  try {
    await executeOrderSyncToOdoo(container, {
      orderId: String(orderId),
      manual: false,
    })
  } catch {
    // Failures are logged inside OdooModuleService
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
  context: {
    subscriberId: "odoo-order-placed-subscriber",
  },
}
