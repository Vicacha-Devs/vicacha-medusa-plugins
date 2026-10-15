import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import {
  DEFAULT_HANDLEBARS_TEMPLATES,
  DEFAULT_TEMPLATE_SECTIONS,
  DEFAULT_TEMPLATE_STYLES,
} from "../../../../modules/documents/renderer/pdfmake/default-templates"
import type { DocumentType } from "../../../../types"
import { createDocumentTemplateWorkflow } from "../../../../workflows/create-document-template"
import { TemplateSchema } from "../../../validators"

/**
 * GET /admin/documents/templates
 * Lists custom templates along with built-in React PDF presets.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const documentType =
    typeof req.query.document_type === "string"
      ? req.query.document_type
      : undefined

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const filters: Record<string, unknown> = {}
  if (documentType) {
    filters.document_type = documentType
  }

  const templates = await documentsService.listDocumentTemplates(filters, {
    order: { created_at: "DESC" },
  })

  const builtinPresets = [
    {
      id: "clean",
      name: "Clean (Modern Minimalist)",
      document_type: "invoice",
      engine: "react-pdf",
      page_size: "A4",
      is_system: true,
    },
    {
      id: "classic",
      name: "Classic (Executive Bordered)",
      document_type: "invoice",
      engine: "react-pdf",
      page_size: "A4",
      is_system: true,
    },
    {
      id: "compact",
      name: "Compact (High-Density B2B / Wholesale)",
      document_type: "invoice",
      engine: "react-pdf",
      page_size: "A4",
      is_system: true,
    },
    {
      id: "packing_slip",
      name: "Standard Packing Slip (No Prices)",
      document_type: "packing_slip",
      engine: "react-pdf",
      page_size: "A4",
      is_system: true,
    },
    {
      id: "credit_note",
      name: "Standard Credit Note (Negative Totals)",
      document_type: "credit_note",
      engine: "react-pdf",
      page_size: "A4",
      is_system: true,
    },
    {
      id: "pos_80mm",
      name: "POS Thermal Receipt (80mm Dynamic Height)",
      document_type: "receipt",
      engine: "react-pdf",
      page_size: "80MM",
      is_system: true,
    },
    {
      id: "pos_58mm",
      name: "POS Thermal Receipt (58mm Dynamic Height)",
      document_type: "receipt",
      engine: "react-pdf",
      page_size: "58MM",
      is_system: true,
    },
  ]

  return res.status(200).json({
    templates,
    builtin_presets: documentType
      ? builtinPresets.filter((p) => p.document_type === documentType)
      : builtinPresets,
  })
}

/**
 * POST /admin/documents/templates
 * Creates a new custom template (Handlebars HTML or POS layout).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = TemplateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid template payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const docType: DocumentType = parsed.data.document_type || "invoice"
  const data = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    document_type: docType,
    engine: parsed.data.engine || "handlebars",
    preset_key: parsed.data.preset_key ?? null,
    page_size:
      parsed.data.page_size || (docType === "receipt" ? "80MM" : "A4"),
    orientation: parsed.data.orientation || "portrait",
    html_content:
      parsed.data.html_content || DEFAULT_HANDLEBARS_TEMPLATES[docType],
    styles: (parsed.data.styles || DEFAULT_TEMPLATE_STYLES) as unknown as Record<
      string,
      unknown
    >,
    sections: (parsed.data.sections ||
      DEFAULT_TEMPLATE_SECTIONS) as unknown as Record<string, unknown>,
    is_default: Boolean(parsed.data.is_default),
    is_system: false,
  }

  const { result: template } = await createDocumentTemplateWorkflow(
    req.scope
  ).run({ input: { data } })

  return res.status(201).json({ template })
}
