import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import {
  normalizeStringArrayParam,
  resolveStorefrontSalesChannelIds,
} from "../../../middlewares"
import {
  StoreFederatedSearchSchema,
  StoreSearchParamsSchema,
} from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = StoreSearchParamsSchema.safeParse(req.query || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid search query parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const salesChannelIds = resolveStorefrontSalesChannelIds(req)

  try {
    const result = await typesenseService.search({
      entity: input.entity,
      q: input.q,
      mode: input.mode,
      alpha: input.alpha,
      filters: input.filters as Record<string, any> | undefined,
      facets: normalizeStringArrayParam(input.facets),
      rangeFacets: input.range_facets as any,
      disjunctiveFacets: input.disjunctive_facets ?? true,
      sortBy: input.sort_by,
      groupBy: input.group_by,
      groupLimit: input.group_limit,
      highlightFields: normalizeStringArrayParam(input.highlight_fields),
      numTypos: input.num_typos,
      page: input.page,
      limit: input.limit,
      offset: input.offset,
      locale: input.locale,
      salesChannelIds,
      enforceStorefrontVisibility: true,
    })

    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to execute search",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as Record<string, any>
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const salesChannelIds = resolveStorefrontSalesChannelIds(req)

  if (Array.isArray(body.queries)) {
    const parsedFed = StoreFederatedSearchSchema.safeParse(body)
    if (!parsedFed.success) {
      return res.status(400).json({
        message: "Invalid federated search payload",
        errors: parsedFed.error.flatten().fieldErrors,
      })
    }

    try {
      const federatedResult = await typesenseService.federatedSearch({
        queries: parsedFed.data.queries.map((q) => ({
          entity: q.entity,
          q: q.q,
          mode: q.mode,
          alpha: q.alpha,
          filters: q.filters as Record<string, any> | undefined,
          facets: q.facets,
          rangeFacets: q.range_facets as any,
          disjunctiveFacets: q.disjunctive_facets ?? true,
          sortBy: q.sort_by,
          limit: q.limit,
          page: q.page,
          offset: q.offset,
          locale: q.locale,
        })),
        salesChannelIds,
        enforceStorefrontVisibility: true,
      })
      return res.status(200).json(federatedResult)
    } catch (error: any) {
      return res.status(500).json({
        message: "Failed to execute federated search",
        detail: error?.message || "Unknown error",
      })
    }
  }

  const parsedSingle = StoreSearchParamsSchema.safeParse(body)
  if (!parsedSingle.success) {
    return res.status(400).json({
      message: "Invalid search payload",
      errors: parsedSingle.error.flatten().fieldErrors,
    })
  }

  const input = parsedSingle.data
  try {
    const result = await typesenseService.search({
      entity: input.entity,
      q: input.q,
      mode: input.mode,
      alpha: input.alpha,
      vector: input.vector,
      vectorField: input.vector_field,
      filters: input.filters as Record<string, any> | undefined,
      facets: normalizeStringArrayParam(input.facets),
      rangeFacets: input.range_facets as any,
      disjunctiveFacets: input.disjunctive_facets ?? true,
      sortBy: input.sort_by,
      groupBy: input.group_by,
      groupLimit: input.group_limit,
      highlightFields: normalizeStringArrayParam(input.highlight_fields),
      numTypos: input.num_typos,
      page: input.page,
      limit: input.limit,
      offset: input.offset,
      locale: input.locale,
      salesChannelIds,
      enforceStorefrontVisibility: true,
      conversationId: input.conversation_id,
    })
    return res.status(200).json(result)
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to execute search",
      detail: error?.message || "Unknown error",
    })
  }
}
