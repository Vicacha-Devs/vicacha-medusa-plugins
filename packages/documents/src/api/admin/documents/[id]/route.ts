import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import { deleteDocumentWorkflow } from "../../../../workflows/delete-document"

/**
 * GET /admin/documents/:id
 * Retrieves a single document along with its signature requests and related documents.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const docs = await documentsService.listDocuments({ id })
  if (docs.length === 0) {
    return res.status(404).json({ message: `Document ${id} not found` })
  }

  const document = docs[0]
  const signatureRequests = await documentsService.listSignatureRequests({
    document_id: id,
  })
  const childDocuments = await documentsService.listDocuments({
    related_document_id: id,
  })

  return res.status(200).json({
    document: {
      ...document,
      signature_request: signatureRequests[0] ?? null,
      signature_requests: signatureRequests,
      related_children: childDocuments,
    },
  })
}

/**
 * DELETE /admin/documents/:id
 * Deletes a draft or failed document record. Generated accounting documents are protected.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const docs = await documentsService.listDocuments({ id })
  if (docs.length === 0) {
    return res.status(404).json({ message: `Document ${id} not found` })
  }

  const doc = docs[0]
  if (
    doc.status === "generated" &&
    (doc.document_type === "invoice" || doc.document_type === "credit_note")
  ) {
    return res.status(400).json({
      message:
        "Generated invoices and credit notes are immutable accounting records and cannot be deleted. Issue a Credit Note instead.",
    })
  }

  await deleteDocumentWorkflow(req.scope).run({ input: { id } })
  return res.status(200).json({ id, object: "document", deleted: true })
}
