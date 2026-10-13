import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeBulkDocumentGeneration } from "../../../../utils/bulk-generate-documents"
import { BulkGenerateSchema } from "../../../middlewares"

/**
 * POST /admin/documents/bulk-generate (Phase 7.1)
 * Generates documents across an array of order_ids.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = BulkGenerateSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid bulk-generate payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const actorId = (req as any).auth_context?.actor_id ?? null
  const summary = await executeBulkDocumentGeneration(req.scope, {
    ...parsed.data,
    actor_id: actorId,
  })

  return res.status(200).json(summary)
}
