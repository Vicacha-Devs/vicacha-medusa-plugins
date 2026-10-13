import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents/types"
import DocumentsModuleService from "../../../../../modules/documents/service"
import { sanitizeFilename } from "../../../../../modules/documents/utils/formatters"

/**
 * GET /admin/documents/:id/pdf
 * Streams the stored PDF (or countersigned PDF if ?signed=true) with strict security headers.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const wantSigned = req.query.signed === "true"
  const download = req.query.download === "true"

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  try {
    if (wantSigned) {
      const sigReqs = await documentsService.listSignatureRequests({
        document_id: id,
        status: "completed",
      })
      const completedSig = sigReqs[0]
      if (completedSig?.signed_file_url) {
        if (
          completedSig.signed_file_url.startsWith(
            "data:application/pdf;base64,"
          )
        ) {
          const b64 = completedSig.signed_file_url.slice(
            "data:application/pdf;base64,".length
          )
          const buf = Buffer.from(b64, "base64")
          const safeName = sanitizeFilename(`signed-${id}.pdf`)
          res.setHeader("Content-Type", "application/pdf")
          res.setHeader("X-Content-Type-Options", "nosniff")
          res.setHeader(
            "Content-Disposition",
            `${download ? "attachment" : "inline"}; filename="${safeName}"`
          )
          return res.status(200).send(buf)
        }
      }
    }

    const { buffer, document } =
      await documentsService.getDocumentPdfBuffer(id)
    const filename = sanitizeFilename(
      `${document.document_type}-${document.document_number}.pdf`
    )

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Length", String(buffer.length))
    res.setHeader(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename="${filename}"`
    )
    return res.status(200).send(buffer)
  } catch (err: any) {
    return res.status(404).json({
      message:
        err instanceof Error ? err.message : "Document PDF could not be loaded",
    })
  }
}
