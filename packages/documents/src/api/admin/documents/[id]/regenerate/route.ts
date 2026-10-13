import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { regenerateDocumentRevisionWorkflow } from "../../../../../workflows/regenerate-document-revision"

/**
 * POST /admin/documents/:id/regenerate
 * Retries a failed document generation OR issues a new versioned revision (v2, v3)
 * while preserving previous PDFs in `prior_versions` and `audit_log`.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = (req.body || {}) as {
    template_id?: string | null
    locale?: string | null
  }
  const actorId = (req as any).auth_context?.actor_id ?? null

  try {
    const { result } = await regenerateDocumentRevisionWorkflow(req.scope).run({
      input: {
        document_id: id,
        template_id: body.template_id ?? null,
        locale: body.locale ?? null,
        actor_id: actorId,
      },
    })

    return res.status(200).json({
      document: result.document,
    })
  } catch (err: any) {
    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Failed to regenerate document",
    })
  }
}
