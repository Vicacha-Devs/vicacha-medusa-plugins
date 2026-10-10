import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const entity =
    typeof req.query?.entity === "string" ? req.query.entity : undefined
  const limit = req.query?.limit ? Number(req.query.limit) : 15

  try {
    const summary = await typesenseService.getAnalyticsSummary({
      entity,
      limit,
    })
    return res.status(200).json(summary)
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to retrieve search analytics",
      detail: error?.message || "Unknown error",
    })
  }
}
