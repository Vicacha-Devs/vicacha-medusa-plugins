import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import DianModuleService from "../../../../../../modules/dian/service"
import { sanitizeArchiveFilename } from "../../../../../../modules/dian/utils"
import { DIAN_MODULE } from "../../../../../../types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const documentId = String(req.params.id || "")
  const format = String((req.query as any)?.format || "pdf").toLowerCase()

  res.setHeader("X-Content-Type-Options", "nosniff")

  if (format === "zip" || format === "attached") {
    const { buffer, filename } =
      await dianService.getAttachedDocumentZipBuffer(documentId)
    const safeName = sanitizeArchiveFilename(filename)
    res.setHeader("Content-Type", "application/zip")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    )
    return res.status(200).send(buffer)
  }

  if (format === "xml") {
    const docs = await dianService.listDianElectronicDocuments({
      id: documentId,
    })
    const doc = docs[0]
    if (!doc || !doc.xml_signed) {
      return res.status(404).json({ message: "Signed UBL XML not found" })
    }
    const safeName = sanitizeArchiveFilename(
      `fv_${doc.document_number}.xml`
    )
    res.setHeader("Content-Type", "application/xml; charset=utf-8")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}"`
    )
    return res.status(200).send(Buffer.from(String(doc.xml_signed), "utf8"))
  }

  const { buffer, document } =
    await dianService.getElectronicDocumentPdfBuffer(
      documentId,
      req.scope as unknown as { resolve: (key: string) => unknown }
    )
  const safeName = sanitizeArchiveFilename(
    `FE_${document.document_number}.pdf`
  )
  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`)
  return res.status(200).send(buffer)
}
