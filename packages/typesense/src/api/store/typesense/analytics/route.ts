import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import { StoreAnalyticsEventSchema } from "../../../middlewares"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = StoreAnalyticsEventSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid analytics event payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  const recorded = await typesenseService.recordSearchInteraction({
    entity: parsed.data.entity,
    query: parsed.data.query,
    clickedDocumentId: parsed.data.clicked_document_id,
    clickPosition: parsed.data.click_position,
    converted: parsed.data.converted,
  })

  return res.status(200).json({ recorded })
}
