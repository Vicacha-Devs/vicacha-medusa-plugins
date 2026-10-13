import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents/types"
import DocumentsModuleService from "../../../../../modules/documents/service"
import { assertCustomerOwnsOrder } from "../../../../middlewares"

/**
 * GET /store/documents/:order_id/signing-url (Phase 6.6)
 * Returns the active Docuseal `embed_src` signing URL so the customer can sign
 * in an embedded `<DocusealForm src={embed_src} />` on the storefront.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.params
  const ownership = await assertCustomerOwnsOrder(req, order_id)
  if (!ownership.allowed) {
    return res.status(ownership.status).json({ message: ownership.message })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const sigReqs = await documentsService.listSignatureRequests({
    order_id,
  })

  const activeReq = sigReqs.find(
    (s: any) =>
      s.status === "sent" || s.status === "opened" || s.status === "pending"
  )

  if (!activeReq || !activeReq.embed_src) {
    return res.status(404).json({
      message: "No active pending signature request found for this order",
    })
  }

  return res.status(200).json({
    signature_request_id: activeReq.id,
    document_id: activeReq.document_id,
    status: activeReq.status,
    embed_src: activeReq.embed_src,
  })
}
