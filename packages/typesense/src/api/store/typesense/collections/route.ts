import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import {
  hydrateHitDocumentsWithMedusaGraph,
  normalizeStringArrayParam,
} from "../../../middlewares"
import { StoreSearchParamsSchema } from "../../../validators"

async function handleStoreCollectionsSearch(
  req: MedusaRequest,
  res: MedusaResponse,
  rawInput: Record<string, any>
) {
  const parsed = StoreSearchParamsSchema.safeParse({
    ...rawInput,
    entity: "collections",
  })

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid collection search parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const searchResult = await typesenseService.search({
      entity: "collections",
      q: input.q,
      mode: input.mode,
      alpha: input.alpha,
      filters: input.filters as Record<string, any> | undefined,
      facets: normalizeStringArrayParam(input.facets),
      disjunctiveFacets: input.disjunctive_facets ?? true,
      sortBy: input.sort_by,
      highlightFields: normalizeStringArrayParam(input.highlight_fields),
      numTypos: input.num_typos,
      page: input.page,
      limit: input.limit,
      offset: input.offset,
      locale: input.locale,
      enforceStorefrontVisibility: true,
    })

    const collections = input.hydrate
      ? await hydrateHitDocumentsWithMedusaGraph(req, {
          graphEntity: "product_collection",
          hits: searchResult.hits,
          fields: normalizeStringArrayParam(input.fields),
        })
      : searchResult.documents

    return res.status(200).json({
      collections,
      hits: searchResult.hits,
      facets: searchResult.facets,
      count: searchResult.found,
      page: searchResult.page,
      limit: searchResult.limit,
      offset: searchResult.offset,
      search_time_ms: searchResult.search_time_ms,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to execute Typesense collection search",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return handleStoreCollectionsSearch(req, res, (req.query || {}) as Record<string, any>)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return handleStoreCollectionsSearch(req, res, (req.body || {}) as Record<string, any>)
}
