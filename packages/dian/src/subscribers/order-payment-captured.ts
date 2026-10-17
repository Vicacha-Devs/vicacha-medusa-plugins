import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import DianModuleService from "../modules/dian/service"
import { DIAN_MODULE } from "../types"
import { emitDianDocumentWorkflow } from "../workflows"

export default async function dianPaymentCapturedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id?: string; order_id?: string }>) {
  const orderId = data?.order_id || data?.id
  if (!orderId) {
    return
  }

  try {
    const dianService = container.resolve<DianModuleService>(DIAN_MODULE)
    const cfg = await dianService.getGlobalConfig()
    if (!cfg.auto_emit_on_payment_captured) {
      return
    }

    await emitDianDocumentWorkflow(container).run({
      input: {
        order_id: orderId,
        document_type: "01",
      },
    })
  } catch {
    // Non-fatal in background subscriber
  }
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
}
