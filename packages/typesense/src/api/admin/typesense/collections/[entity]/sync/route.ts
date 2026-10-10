import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { syncEntitiesToTypesenseWorkflow } from "../../../../../../workflows/sync-entities"
import { AdminSyncEntitySchema } from "../../../../../middlewares"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "").trim()
  if (!entity) {
    return res.status(400).json({ message: "Entity parameter is required" })
  }

  const parsed = AdminSyncEntitySchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid sync request body",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  try {
    const { result } = await syncEntitiesToTypesenseWorkflow(req.scope).run({
      input: {
        entities: [entity],
        ids: parsed.data.ids,
        locale: parsed.data.locale,
        fullReindex: parsed.data.full_reindex,
        triggeredBy: "admin",
      },
    })

    return res.status(200).json({
      entity,
      summaries: result.summaries,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: `Failed to sync entity "${entity}" to Typesense`,
      detail: error?.message || "Unknown error",
    })
  }
}
