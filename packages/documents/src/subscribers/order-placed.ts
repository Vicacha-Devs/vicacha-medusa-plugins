import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { DOCUMENTS_MODULE } from "../modules/documents/types"
import DocumentsModuleService from "../modules/documents/service"
import { generateDocumentWorkflow } from "../workflows/generate-document"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; region_id?: string }>) {
  if (!data?.id) return

  const documentsService =
    container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
  const settings = await documentsService.resolveSettings(data.region_id)

  if (settings.auto_generate_invoice !== false) {
    await generateDocumentWorkflow(container).run({
      input: {
        order_id: data.id,
        document_type: "invoice",
      },
    })
  }

  if (settings.auto_generate_receipt) {
    await generateDocumentWorkflow(container).run({
      input: {
        order_id: data.id,
        document_type: "receipt",
      },
    })
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
