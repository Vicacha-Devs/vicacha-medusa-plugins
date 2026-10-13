import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { executeEventNotificationsDispatch } from "../workflows"

export default async function orderEventsNotificationSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<Record<string, any>>) {
  if (!name) return
  try {
    await executeEventNotificationsDispatch(container, {
      event_name: name,
      event_data: data || {},
    })
  } catch {
    // Non-blocking in event subscriber so order lifecycle never fails
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.completed",
    "order.canceled",
    "order.updated",
    "order.fulfillment_created",
    "order.fulfillment_canceled",
    "order.return_requested",
    "order.return_received",
    "order.refund_created",
  ],
}
