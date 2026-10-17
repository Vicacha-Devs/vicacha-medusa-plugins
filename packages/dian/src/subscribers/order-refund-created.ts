import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import DianModuleService from "../modules/dian/service"
import { DIAN_MODULE } from "../types"
import { emitDianDocumentWorkflow } from "../workflows"

export default async function dianRefundCreatedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ order_id?: string; id?: string }>) {
  const orderId = data?.order_id || data?.id
  if (!orderId) {
    return
  }

  try {
    const dianService = container.resolve<DianModuleService>(DIAN_MODULE)
    const cfg = await dianService.getGlobalConfig()
    if (!cfg.auto_emit_credit_note_on_refund) {
      return
    }

    await emitDianDocumentWorkflow(container).run({
      input: {
        order_id: orderId,
        document_type: "91",
        discrepancy_concept_code: "1",
        discrepancy_description:
          "Nota Crédito Electrónica por reembolso / devolución en orden",
      },
    })
  } catch {
    // Non-fatal in background subscriber
  }
}

export const config: SubscriberConfig = {
  event: "order.refund_created",
}
