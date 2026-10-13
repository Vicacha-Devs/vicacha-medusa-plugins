import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { markDocumentsStaleWorkflow } from "../workflows/mark-documents-stale"

export default async function orderCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) return

  await markDocumentsStaleWorkflow(container).run({
    input: {
      order_id: data.id,
      reason: "Order was canceled",
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
