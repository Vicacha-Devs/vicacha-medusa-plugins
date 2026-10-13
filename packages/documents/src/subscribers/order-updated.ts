import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { markDocumentsStaleWorkflow } from "../workflows/mark-documents-stale"

export default async function orderUpdatedHandler({
  event: { data, name },
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const orderId = data?.order_id || data?.id
  if (!orderId) return

  await markDocumentsStaleWorkflow(container).run({
    input: {
      order_id: orderId,
      reason:
        name === "order.edit_confirmed"
          ? "Order edit was confirmed after document generation"
          : "Order details were modified after document generation",
    },
  })
}

export const config: SubscriberConfig = {
  event: ["order.updated", "order.edit_confirmed"],
}
