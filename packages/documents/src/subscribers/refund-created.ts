import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { DOCUMENTS_MODULE } from "../modules/documents/types"
import DocumentsModuleService from "../modules/documents/service"
import { generateDocumentWorkflow } from "../workflows/generate-document"

export default async function refundCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id?: string
  order_id?: string
  refund_id?: string
  amount?: number
  reason?: string
  note?: string
  region_id?: string
}>) {
  const orderId = data?.order_id
  if (!orderId) return

  const documentsService =
    container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
  const settings = await documentsService.resolveSettings(data.region_id)

  if (settings.auto_generate_credit_note === false) {
    return
  }

  // Locate original generated invoice for the order if present
  const existingInvoices = await documentsService.listDocuments({
    order_id: orderId,
    document_type: "invoice",
    status: "generated",
  })
  const originalInvoice = existingInvoices[0] ?? null

  await generateDocumentWorkflow(container).run({
    input: {
      order_id: orderId,
      document_type: "credit_note",
      refund_id: data.refund_id || data.id || null,
      refund_amount: data.amount ?? null,
      refund_reason:
        [data.reason, data.note].filter(Boolean).join(" — ") || "Order refund",
      related_document_id: originalInvoice?.id ?? null,
    },
  })
}

export const config: SubscriberConfig = {
  event: ["order.refund_created", "payment.refunded"],
}
