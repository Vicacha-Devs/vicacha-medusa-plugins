import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type OdooModuleService from "../modules/odoo/service"
import { ODOO_MODULE } from "../modules/odoo/types"
import { executeOrderSyncToOdoo } from "../workflows"

export default async function odooOrderPlacedSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const orderId = event?.data?.id || event?.data?.order_id
  if (!orderId) return

  try {
    if (event?.name === "order.canceled") {
      const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
      await odooService.cancelOrderInOdoo(String(orderId), "event")
      return
    }

    await executeOrderSyncToOdoo(container, {
      orderId: String(orderId),
      manual: false,
    })
  } catch {
    // Failures are logged inside OdooModuleService
  }
}

export const config: SubscriberConfig = {
  event: ["order.placed", "order.canceled"],
  context: {
    subscriberId: "odoo-order-placed-subscriber",
  },
}
