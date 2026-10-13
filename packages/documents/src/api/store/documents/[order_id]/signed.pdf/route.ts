import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents/types"
import DocumentsModuleService from "../../../../../modules/documents/service"
import { sanitizeFilename } from "../../../../../modules/documents/utils/formatters"
import { assertCustomerOwnsOrder } from "../../../../middlewares"

/**
 * GET /store/documents/:order_id/signed.pdf (Phase 6.6)
 * Streams the completed Docuseal countersigned PDF to the authenticated customer.
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
    status: "completed",
  })

  if (sigReqs.length === 0 || !sigReqs[0].signed_file_url) {
    return res.status(404).json({
      message: "No completed signed document found for this order",
    })
  }

  const sigReq = sigReqs[0]
  const fileUrl = sigReq.signed_file_url as string

  if (fileUrl.startsWith("data:application/pdf;base64,")) {
    const b64 = fileUrl.slice("data:application/pdf;base64,".length)
    const buffer = Buffer.from(b64, "base64")
    const filename = sanitizeFilename(`signed-order-${order_id}.pdf`)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Length", String(buffer.length))
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
    return res.status(200).send(buffer)
  }

  try {
    const buffer = await documentsService.docuseal.downloadSignedPdf(fileUrl)
    const filename = sanitizeFilename(`signed-order-${order_id}.pdf`)

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Length", String(buffer.length))
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`)
    return res.status(200).send(buffer)
  } catch (err: any) {
    return res.status(404).json({
      message:
        err instanceof Error ? err.message : "Failed to load signed PDF",
    })
  }
}
