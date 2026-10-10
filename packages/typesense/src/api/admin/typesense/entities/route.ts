import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import { AdminUpsertEntityConfigSchema } from "../../../middlewares"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const definitions = await typesenseService.getAllEntityDefinitions()
    return res.status(200).json({
      entities: definitions.map((d) => ({
        ...d,
        embedder: d.embedder
          ? {
              ...d.embedder,
              api_key: d.embedder.api_key ? "***masked***" : undefined,
            }
          : null,
      })),
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to list entity configurations",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = AdminUpsertEntityConfigSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid entity configuration payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const updated = await typesenseService.upsertEntityConfig({
      entity: input.entity,
      enabled: input.enabled,
      graphEntity: input.graph_entity,
      graphFields: input.graph_fields,
      queryBy: input.query_by || [
        "title",
        "name",
        "handle",
        "slug",
        "description",
      ],
      queryByWeights: input.query_by_weights,
      facetBy: input.facet_by,
      defaultSortBy: input.default_sort_by,
      enableNestedFields: input.enable_nested_fields,
      embedder: input.embedder as any,
      locales: input.locales,
      stopwordsSetId: input.stopwords_set_id,
      events: input.events,
      schemaFields: input.schema_fields as any,
      storefrontFilterConstraint: input.storefront_filter_constraint,
    })

    return res.status(200).json({
      entity_config: {
        ...updated,
        embedder: updated.embedder
          ? {
              ...updated.embedder,
              api_key: updated.embedder.api_key ? "***masked***" : undefined,
            }
          : null,
      },
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to save entity configuration",
      detail: error?.message || "Unknown error",
    })
  }
}
