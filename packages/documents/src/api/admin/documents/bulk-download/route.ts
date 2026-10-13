import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import {
  createZipArchive,
  ZipFileEntry,
} from "../../../../modules/documents/utils/zip-builder"
import { sanitizeFilename } from "../../../../modules/documents/utils/formatters"
import { BulkDownloadSchema } from "../../../middlewares"

/**
 * POST /admin/documents/bulk-download (Phase 7.2)
 * Bundles multiple generated PDFs into a single `.zip` archive and streams it.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = BulkDownloadSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid bulk-download payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const entries: ZipFileEntry[] = []
  for (const docId of parsed.data.document_ids) {
    try {
      const { buffer, document } =
        await documentsService.getDocumentPdfBuffer(docId)
      entries.push({
        filename: sanitizeFilename(
          `${document.document_type}-${document.document_number}.pdf`
        ),
        content: buffer,
        modifiedAt: document.generated_at
          ? new Date(document.generated_at)
          : new Date(),
      })
    } catch {
      // Skip documents whose PDF cannot be loaded
    }
  }

  if (entries.length === 0) {
    return res.status(404).json({
      message: "No downloadable PDFs found for the requested document_ids",
    })
  }

  const zipBuffer = createZipArchive(entries)
  const dateSlug = new Date().toISOString().slice(0, 10)

  res.setHeader("Content-Type", "application/zip")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("Content-Length", String(zipBuffer.length))
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="documents-${dateSlug}.zip"`
  )
  return res.status(200).send(zipBuffer)
}
