import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import {
  hydrateHitDocumentsWithMedusaGraph,
  normalizeStringArrayParam,
  resolveStorefrontSalesChannelIds,
  StoreSearchParamsSchema,
} from "../../../middlewares"

async function handleStoreProductsSearch(
  req: MedusaRequest,
  res: MedusaResponse,
  rawInput: Record<string, any>
) {
  const parsed = StoreSearchParamsSchema.safeParse({
    ...rawInput,
    entity: "products",
  })

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid product search parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const salesChannelIds = resolveStorefrontSalesChannelIds(req)

  try {
    const searchResult = await typesenseService.search({
      entity: "products",
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

    const products = input.hydrate
      ? await hydrateHitDocumentsWithMedusaGraph(req, {
          graphEntity: "product",
          hits: searchResult.hits,
          fields: normalizeStringArrayParam(input.fields),
          regionId: input.region_id,
          currencyCode: input.currency_code,
          countryCode: input.country_code,
          province: input.province,
        })
      : searchResult.documents

    return res.status(200).json({
      products,
      hits: searchResult.hits,
      facets: searchResult.facets,
      count: searchResult.found,
      out_of: searchResult.out_of,
      page: searchResult.page,
      limit: searchResult.limit,
      offset: searchResult.offset,
      mode: searchResult.mode,
      query: searchResult.query,
      search_time_ms: searchResult.search_time_ms,
      ...(searchResult.conversation
        ? { conversation: searchResult.conversation }
        : {}),
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to execute Typesense product search",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return handleStoreProductsSearch(req, res, (req.query || {}) as Record<string, any>)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return handleStoreProductsSearch(req, res, (req.body || {}) as Record<string, any>)
}
