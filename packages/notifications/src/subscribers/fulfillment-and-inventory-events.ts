import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { executeEventNotificationsDispatch } from "../workflows"

export default async function fulfillmentAndInventorySubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<Record<string, any>>) {
  if (!name) return
  const normalizedEvent =
    name === "fulfillment.shipment_created"
      ? "shipment.created"
      : name === "fulfillment.delivery_created"
        ? "delivery.created"
        : name

  try {
    await executeEventNotificationsDispatch(container, {
      event_name: normalizedEvent,
      event_data: data || {},
    })
  } catch {
    // Non-blocking in event subscriber
  }
}

export const config: SubscriberConfig = {
  event: [
    "shipment.created",
    "delivery.created",
    "fulfillment.created",
    "fulfillment.shipment_created",
    "fulfillment.delivery_created",
    "inventory-level.updated",
  ],
}
