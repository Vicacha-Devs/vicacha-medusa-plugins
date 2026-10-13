import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { executeEventNotificationsDispatch } from "../workflows"

export default async function customerAndDocumentEventsSubscriber({
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
    // Non-blocking in event subscriber
  }
}

export const config: SubscriberConfig = {
  event: [
    "customer.created",
    "customer.updated",
    "document.generated",
    "auth.otp_generated",
    "loyalty.points_credited",
    "loyalty.points_debited",
    "wallet.credited",
    "wallet.debited",
    "membership.tier_changed",
    "contact.form_submitted",
  ],
}
