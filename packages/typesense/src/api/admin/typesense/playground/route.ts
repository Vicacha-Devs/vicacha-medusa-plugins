import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import { AdminPlaygroundSearchSchema } from "../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = AdminPlaygroundSearchSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid playground search payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const result = await typesenseService.search({
      entity: input.entity,
      q: input.q,
      mode: input.mode,
      alpha: input.alpha,
      filters: input.filters as Record<string, any> | undefined,
      filterBy: input.filter_by,
      facets: input.facets,
      rangeFacets: input.range_facets as any,
      disjunctiveFacets: input.disjunctive_facets,
      sortBy: input.sort_by,
      groupBy: input.group_by,
      groupLimit: input.group_limit,
      pinnedHits: input.pinned_hits,
      hiddenHits: input.hidden_hits,
      enableOverrides: input.enable_overrides,
      enableSynonyms: input.enable_synonyms,
      limit: input.limit,
      page: input.page,
      locale: input.locale,
      conversationId: input.conversation_id,
      conversationModelId: input.conversation_model_id,
      trackAnalytics: false,
    })

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({
      message: "Playground search failed",
      detail: error?.message || "Unknown error",
    })
  }
}
