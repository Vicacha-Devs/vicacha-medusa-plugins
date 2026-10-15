import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { DOCUMENTS_MODULE } from "../../../modules/documents/types"
import DocumentsModuleService from "../../../modules/documents/service"
import {
  GenerateDocumentSchema,
  ListDocumentsQuerySchema,
} from "../../validators"
import { generateDocumentWorkflow } from "../../../workflows/generate-document"

/**
 * GET /admin/documents
 * Lists generated documents with filtering by order_id, document_type, status, is_stale,
 * search query (document_number), and date range.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = ListDocumentsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid query parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const {
    order_id,
    document_type,
    status,
    is_stale,
    q,
    date_from,
    date_to,
    limit,
    offset,
  } = parsed.data

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const filters: Record<string, unknown> = {}
  if (order_id) filters.order_id = order_id
  if (document_type) filters.document_type = document_type
  if (status) filters.status = status
  if (is_stale !== undefined) filters.is_stale = is_stale === "true"
  if (q && q.trim().length > 0) {
    filters.q = q.trim()
  }
  if (date_from || date_to) {
    const createdAtFilter: Record<string, Date> = {}
    if (date_from) createdAtFilter.$gte = new Date(date_from)
    if (date_to) createdAtFilter.$lte = new Date(date_to)
    filters.created_at = createdAtFilter
  }

  const [documents, count] = await documentsService.listAndCountDocuments(
    filters,
    {
      take: limit,
      skip: offset,
      order: { created_at: "DESC" },
    }
  )

  // Hydrate latest signature request for each listed document
  const docIds = documents.map((d: any) => d.id)
  const signatureRequests =
    docIds.length > 0
      ? await documentsService.listSignatureRequests({
          document_id: docIds,
        })
      : []

  const sigByDocId = new Map<string, any>()
  for (const sig of signatureRequests) {
    sigByDocId.set(sig.document_id, sig)
  }

  const enriched = documents.map((doc: any) => ({
    ...doc,
    signature_request: sigByDocId.get(doc.id) ?? null,
  }))

  return res.status(200).json({
    documents: enriched,
    count,
    limit,
    offset,
  })
}

/**
 * POST /admin/documents
 * Generates a document (invoice, packing_slip, credit_note, or receipt) for an order.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = GenerateDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const actorId = (req as any).auth_context?.actor_id ?? null

  try {
    const { result } = await generateDocumentWorkflow(req.scope).run({
      input: {
        ...parsed.data,
        actor_id: actorId,
      },
    })

    return res.status(result.was_created ? 201 : 200).json({
      document: result.document,
      was_created: result.was_created,
    })
  } catch (err: any) {
    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Failed to generate document",
    })
  }
}
