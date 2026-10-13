import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import { assertCustomerOwnsOrder } from "../../../middlewares"

/**
 * GET /store/documents/:order_id
 * Returns the customer's generated documents (invoices, packing slips, credit notes, receipts)
 * and any active signature requests for the order.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.params
  const ownership = await assertCustomerOwnsOrder(req, order_id)
  if (!ownership.allowed) {
    return res.status(ownership.status).json({ message: ownership.message })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const documents = await documentsService.listDocuments(
    {
      order_id,
      status: "generated",
    },
    { order: { created_at: "DESC" } }
  )

  const sigRequests = await documentsService.listSignatureRequests({
    order_id,
  })

  return res.status(200).json({
    documents: documents.map((d: any) => ({
      id: d.id,
      document_number: d.document_number,
      document_type: d.document_type,
      version: d.version,
      locale: d.locale,
      generated_at: d.generated_at,
      download_path: `/store/documents/${order_id}/${d.document_type.replace(/_/g, "-")}.pdf`,
    })),
    signature_requests: sigRequests.map((s: any) => ({
      id: s.id,
      document_id: s.document_id,
      status: s.status,
      embed_src:
        s.status === "sent" || s.status === "opened" || s.status === "pending"
          ? s.embed_src
          : null,
      completed_at: s.completed_at,
      signed_download_path:
        s.status === "completed"
          ? `/store/documents/${order_id}/signed.pdf`
          : null,
    })),
  })
}
