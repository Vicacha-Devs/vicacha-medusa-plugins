import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents/types"
import DocumentsModuleService from "../../../../../modules/documents/service"
import { TemplateSchema } from "../../../../middlewares"
import { updateDocumentTemplateWorkflow } from "../../../../../workflows/update-document-template"
import { deleteDocumentTemplateWorkflow } from "../../../../../workflows/delete-document-template"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const found = await documentsService.listDocumentTemplates({ id })
  if (found.length === 0) {
    return res.status(404).json({ message: `Template ${id} not found` })
  }

  return res.status(200).json({ template: found[0] })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const parsed = TemplateSchema.partial().safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid template update payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const existing = await documentsService.listDocumentTemplates({ id })
  if (existing.length === 0) {
    return res.status(404).json({ message: `Template ${id} not found` })
  }

  const { result: updated } = await updateDocumentTemplateWorkflow(
    req.scope
  ).run({ input: { id, data: parsed.data } })

  return res.status(200).json({ template: updated })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const existing = await documentsService.listDocumentTemplates({ id })
  if (existing.length === 0) {
    return res.status(404).json({ message: `Template ${id} not found` })
  }

  if (existing[0].is_system) {
    return res
      .status(400)
      .json({ message: "System preset templates cannot be deleted" })
  }

  await deleteDocumentTemplateWorkflow(req.scope).run({ input: { id } })
  return res.status(200).json({ id, object: "document_template", deleted: true })
}
