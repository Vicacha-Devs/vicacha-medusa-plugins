import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import { syncEntitiesToTypesenseWorkflow } from "../../../../workflows/sync-entities"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const overview = await typesenseService.getClusterOverview()
    return res.status(200).json({
      collections: overview.collections,
      healthy: overview.healthy,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to list Typesense collections",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const body = (req.body || {}) as {
      entities?: string[]
      locale?: string
      full_reindex?: boolean
    }
    const { result } = await syncEntitiesToTypesenseWorkflow(req.scope).run({
      input: {
        entities: body.entities,
        locale: body.locale,
        fullReindex: body.full_reindex !== false,
        triggeredBy: "admin",
      },
    })

    return res.status(200).json({
      summaries: result.summaries,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to synchronize entities to Typesense",
      detail: error?.message || "Unknown error",
    })
  }
}
