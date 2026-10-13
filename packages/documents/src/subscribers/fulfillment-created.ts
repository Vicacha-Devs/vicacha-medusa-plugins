import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { DOCUMENTS_MODULE } from "../modules/documents/types"
import DocumentsModuleService from "../modules/documents/service"
import { generateDocumentWorkflow } from "../workflows/generate-document"

export default async function fulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id?: string
  order_id?: string
  fulfillment_id?: string
  region_id?: string
}>) {
  const orderId = data?.order_id
  const fulfillmentId = data?.fulfillment_id || data?.id
  if (!orderId) return

  const documentsService =
    container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
  const settings = await documentsService.resolveSettings(data.region_id)

  if (!settings.auto_generate_packing_slip) {
    return
  }

  await generateDocumentWorkflow(container).run({
    input: {
      order_id: orderId,
      document_type: "packing_slip",
      fulfillment_id: fulfillmentId ?? null,
    },
  })
}

export const config: SubscriberConfig = {
  event: ["order.fulfillment_created", "shipment.created"],
}
