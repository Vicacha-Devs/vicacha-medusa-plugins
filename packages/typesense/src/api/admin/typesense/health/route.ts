import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const overview = await typesenseService.getClusterOverview()
    const options = await typesenseService.getPluginOptions()
    return res.status(200).json({
      ...overview,
      options: {
        collectionPrefix: options.collectionPrefix,
        autoIndex: options.autoIndex,
        zeroDowntimeSwap: options.zeroDowntimeSwap,
        defaultLocale: options.defaultLocale,
        locales: options.locales,
        hasApiKey: options.hasApiKey,
        hasSearchOnlyApiKey: options.hasSearchOnlyApiKey,
        embedder: options.embedder
          ? {
              enabled: options.embedder.enabled,
              model_name: options.embedder.model_name,
              field_name: options.embedder.field_name || "embedding",
            }
          : null,
      },
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to fetch Typesense cluster overview",
      detail: error?.message || "Unknown error",
    })
  }
}
