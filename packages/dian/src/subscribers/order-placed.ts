import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import DianModuleService from "../modules/dian/service"
import { DIAN_MODULE } from "../types"
import { emitDianDocumentWorkflow } from "../workflows"

export default async function dianOrderPlacedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  if (!data?.id) {
    return
  }

  try {
    const dianService = container.resolve<DianModuleService>(DIAN_MODULE)
    const cfg = await dianService.getGlobalConfig()
    if (!cfg.auto_emit_on_order_placed) {
      return
    }

    await emitDianDocumentWorkflow(container).run({
      input: {
        order_id: data.id,
        document_type: "01",
      },
    })
  } catch {
    // Do not block order placement if automatic DIAN emission fails
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
