import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE, DocumentType } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import { sanitizeFilename } from "../../../../modules/documents/utils/formatters"
import { assertCustomerOwnsOrder } from "../../../middlewares"

export async function serveStoreOrderDocumentPdf(
  req: MedusaRequest,
  res: MedusaResponse,
  documentType: DocumentType
) {
  const { order_id } = req.params
  const ownership = await assertCustomerOwnsOrder(req, order_id)
  if (!ownership.allowed) {
    return res.status(ownership.status).json({ message: ownership.message })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const docs = await documentsService.listDocuments(
    {
      order_id,
      document_type: documentType,
      status: "generated",
    },
    { order: { created_at: "DESC" } }
  )

  if (docs.length === 0) {
    return res.status(404).json({
      message: `No generated ${documentType.replace(/_/g, " ")} found for order ${order_id}`,
    })
  }

  const targetDoc = docs[0]
  try {
    const { buffer } = await documentsService.getDocumentPdfBuffer(targetDoc.id)
    const filename = sanitizeFilename(
      `${documentType}-${targetDoc.document_number}.pdf`
    )

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Length", String(buffer.length))
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
    return res.status(200).send(buffer)
  } catch (err: any) {
    return res.status(404).json({
      message:
        err instanceof Error ? err.message : "Failed to load document PDF",
    })
  }
}
