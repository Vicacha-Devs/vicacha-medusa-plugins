import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"
import { z } from "zod"
import { SEARCH_MODES } from "../modules/typesense/types"

export const RangeFacetSpecSchema = z.object({
  field: z.string().min(1).max(120),
  ranges: z
    .array(
      z.object({
        label: z.string().min(1).max(64),
        from: z.number().optional(),
        to: z.number().optional(),
      })
    )
    .min(1)
    .max(20),
})

export const StoreSearchParamsSchema = z.object({
  q: z.string().max(500).optional().default("*"),
  entity: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .default("products"),
  mode: z.enum(SEARCH_MODES).optional().default("keyword"),
  alpha: z.coerce.number().min(0).max(1).optional().default(0.3),
  vector: z.array(z.number()).max(4096).optional(),
  vector_field: z.string().max(64).optional(),
  filters: z.record(z.unknown()).optional(),
  facets: z.union([z.string(), z.array(z.string())]).optional(),
  range_facets: z.array(RangeFacetSpecSchema).optional(),
  disjunctive_facets: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .transform((v) => v === true || v === "true"),
  sort_by: z.string().max(200).optional(),
  group_by: z.string().max(64).optional(),
  group_limit: z.coerce.number().int().min(1).max(20).optional(),
  highlight_fields: z.union([z.string(), z.array(z.string())]).optional(),
  num_typos: z.coerce.number().int().min(0).max(2).optional().default(2),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional(),
  locale: z.string().max(16).optional(),
  region_id: z.string().max(64).optional(),
  currency_code: z.string().max(10).optional(),
  country_code: z.string().max(10).optional(),
  province: z.string().max(64).optional(),
  fields: z.union([z.string(), z.array(z.string())]).optional(),
  hydrate: z
    .union([z.boolean(), z.enum(["true", "false"])])
    .optional()
    .default(true)
    .transform((v) => v !== false && v !== "false"),
  conversation_id: z.string().max(128).optional(),
})

export const StoreFederatedSearchSchema = z.object({
  queries: z
    .array(
      z.object({
        entity: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-zA-Z0-9_-]+$/),
        q: z.string().max(500).optional().default("*"),
        mode: z.enum(SEARCH_MODES).optional().default("keyword"),
        alpha: z.number().min(0).max(1).optional(),
        filters: z.record(z.unknown()).optional(),
        facets: z.array(z.string()).optional(),
        range_facets: z.array(RangeFacetSpecSchema).optional(),
        disjunctive_facets: z.boolean().optional(),
        sort_by: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(100).optional().default(10),
        page: z.number().int().min(1).max(1000).optional().default(1),
        offset: z.number().int().min(0).optional(),
        locale: z.string().max(16).optional(),
      })
    )
    .min(1)
    .max(10),
})

export const StoreScopedTokenQuerySchema = z.object({
  entities: z.string().max(250).optional(),
  locale: z.string().max(16).optional(),
  expires_in: z.coerce.number().int().min(60).max(86400).optional(),
})

export const StoreConversationalChatSchema = z.object({
  q: z.string().min(1).max(1000),
  entity: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .default("products"),
  conversation_id: z.string().max(128).optional(),
  model_id: z.string().max(128).optional(),
  locale: z.string().max(16).optional(),
  alpha: z.number().min(0).max(1).optional().default(0.4),
  limit: z.number().int().min(1).max(20).optional().default(8),
  filters: z.record(z.unknown()).optional(),
})

export const StoreAnalyticsEventSchema = z.object({
  entity: z.string().max(64).optional().default("products"),
  query: z.string().min(1).max(500),
  clicked_document_id: z.string().max(128).optional(),
  click_position: z.number().int().min(1).max(1000).optional(),
  converted: z.boolean().optional(),
})

export const AdminSyncEntitySchema = z.object({
  ids: z.array(z.string().min(1)).max(1000).optional(),
  locale: z.string().max(16).optional(),
  full_reindex: z.boolean().optional().default(true),
})

export const AdminUpsertEntityConfigSchema = z.object({
  entity: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/),
  enabled: z.boolean().optional().default(true),
  graph_entity: z.string().max(64).optional(),
  graph_fields: z.array(z.string()).optional(),
  query_by: z.array(z.string()).min(1).optional(),
  query_by_weights: z.array(z.number().min(1).max(100)).optional(),
  facet_by: z.array(z.string()).optional(),
  default_sort_by: z.string().max(120).optional(),
  enable_nested_fields: z.boolean().optional().default(true),
  embedder: z
    .object({
      enabled: z.boolean(),
      field_name: z.string().max(64).optional(),
      embed_from: z.array(z.string()).optional(),
      model_name: z.string().min(1).max(120),
      api_key: z.string().max(512).optional(),
      url: z.string().url().optional(),
      num_dim: z.number().int().min(1).max(8192).optional(),
      indexing_prefix: z.string().max(100).optional(),
      query_prefix: z.string().max(100).optional(),
    })
    .nullable()
    .optional(),
  locales: z.array(z.string().max(16)).optional(),
  stopwords_set_id: z.string().max(64).nullable().optional(),
  events: z
    .object({
      created: z.union([z.string(), z.array(z.string())]).optional(),
      updated: z.union([z.string(), z.array(z.string())]).optional(),
      deleted: z.union([z.string(), z.array(z.string())]).optional(),
    })
    .optional(),
  schema_fields: z.array(z.record(z.unknown())).optional(),
  storefront_filter_constraint: z.string().max(500).optional(),
})

export const AdminSynonymSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  synonyms: z.array(z.string().min(1).max(120)).min(1).max(50),
  root: z.string().max(120).optional(),
  locale: z.string().max(16).optional(),
  symbols_to_index: z.array(z.string().max(4)).optional(),
})

export const AdminCurationSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  rule: z.object({
    query: z.string().max(250).optional(),
    match: z.enum(["exact", "contains"]).optional().default("exact"),
    filter_by: z.string().max(500).optional(),
    tags: z.array(z.string().max(64)).optional(),
  }),
  includes: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
        position: z.number().int().min(1).max(1000),
      })
    )
    .optional(),
  excludes: z
    .array(
      z.object({
        id: z.string().min(1).max(128),
      })
    )
    .optional(),
  filter_by: z.string().max(500).optional(),
  sort_by: z.string().max(200).optional(),
  replace_query: z.string().max(250).optional(),
  remove_matched_tokens: z.boolean().optional(),
  filter_curated_hits: z.boolean().optional(),
  effective_from_ts: z.number().int().optional(),
  effective_to_ts: z.number().int().optional(),
  stop_processing: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const AdminStopwordSetSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/),
  stopwords: z.array(z.string().min(1).max(80)).min(1).max(500),
  locale: z.string().max(16).optional(),
})

export const AdminPlaygroundSearchSchema = z.object({
  entity: z.string().min(1).max(64).default("products"),
  q: z.string().max(500).optional().default("*"),
  mode: z.enum(SEARCH_MODES).optional().default("keyword"),
  alpha: z.number().min(0).max(1).optional().default(0.3),
  filters: z.record(z.unknown()).optional(),
  filter_by: z.string().max(500).optional(),
  facets: z.array(z.string()).optional(),
  range_facets: z.array(RangeFacetSpecSchema).optional(),
  disjunctive_facets: z.boolean().optional().default(true),
  sort_by: z.string().max(200).optional(),
  group_by: z.string().max(64).optional(),
  group_limit: z.number().int().min(1).max(20).optional(),
  pinned_hits: z.string().max(500).optional(),
  hidden_hits: z.string().max(500).optional(),
  enable_overrides: z.boolean().optional().default(true),
  enable_synonyms: z.boolean().optional().default(true),
  limit: z.number().int().min(1).max(100).optional().default(20),
  page: z.number().int().min(1).max(1000).optional().default(1),
  locale: z.string().max(16).optional(),
  conversation_id: z.string().max(128).optional(),
  conversation_model_id: z.string().max(128).optional(),
})

/**
 * Extracts the publishable API key's sales channel IDs from the Medusa request context
 * so storefront queries cannot access products from unauthorized sales channels.
 */
export function resolveStorefrontSalesChannelIds(req: MedusaRequest): string[] {
  const pubContext = (req as any).publishable_key_context
  if (
    pubContext &&
    Array.isArray(pubContext.sales_channel_ids) &&
    pubContext.sales_channel_ids.length > 0
  ) {
    return pubContext.sales_channel_ids.map((id: any) => String(id))
  }
  return []
}

export function normalizeStringArrayParam(
  val: string | string[] | undefined
): string[] | undefined {
  if (!val) return undefined
  if (Array.isArray(val)) {
    return val
      .flatMap((v) => String(v).split(","))
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Hydrates ordered document IDs returned by Typesense through Medusa's `query.graph`,
 * preserving exact Typesense ranking order and live calculated_price / inventory_quantity.
 */
export async function hydrateHitDocumentsWithMedusaGraph(
  req: MedusaRequest,
  params: {
    graphEntity: string
    hits: Array<{ document: Record<string, any>; highlights?: any[]; text_match?: number }>
    fields?: string[]
    regionId?: string
    currencyCode?: string
    countryCode?: string
    province?: string
  }
): Promise<Record<string, any>[]> {
  const { hits, graphEntity, fields } = params
  if (!Array.isArray(hits) || hits.length === 0) {
    return []
  }

  const orderedIds = hits
    .map((h) => String(h.document?.id || ""))
    .filter(Boolean)
  if (orderedIds.length === 0) {
    return hits.map((h) => h.document)
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
    if (!query || typeof query.graph !== "function") {
      return hits.map((h) => h.document)
    }

    const defaultFields =
      graphEntity === "product"
        ? [
            "id",
            "title",
            "subtitle",
            "description",
            "handle",
            "status",
            "thumbnail",
            "is_giftcard",
            "discountable",
            "weight",
            "origin_country",
            "material",
            "created_at",
            "updated_at",
            "metadata",
            "collection.*",
            "categories.*",
            "tags.*",
            "options.*",
            "options.values.*",
            "variants.*",
            "variants.options.*",
            "variants.calculated_price.*",
            "variants.inventory_quantity",
          ]
        : ["*"]

    const contextObj: Record<string, any> = {}
    if (
      graphEntity === "product" &&
      (params.regionId || params.currencyCode)
    ) {
      const pricingCtx: Record<string, any> = {}
      if (params.regionId) pricingCtx.region_id = params.regionId
      if (params.currencyCode) pricingCtx.currency_code = params.currencyCode
      if (params.countryCode) pricingCtx.country_code = params.countryCode
      if (params.province) pricingCtx.province = params.province
      contextObj.variants = {
        calculated_price:
          typeof QueryContext === "function"
            ? QueryContext(pricingCtx)
            : pricingCtx,
      }
    }

    const { data } = await query.graph({
      entity: graphEntity,
      fields: fields && fields.length > 0 ? fields : defaultFields,
      filters: { id: orderedIds },
      ...(Object.keys(contextObj).length > 0 ? { context: contextObj } : {}),
    })

    if (!Array.isArray(data) || data.length === 0) {
      return hits.map((h) => h.document)
    }

    const byId = new Map<string, Record<string, any>>()
    for (const item of data) {
      if (item?.id) {
        byId.set(String(item.id), item)
      }
    }

    const hydrated: Record<string, any>[] = []
    for (const hit of hits) {
      const id = String(hit.document?.id || "")
      const record = byId.get(id)
      if (record) {
        hydrated.push({
          ...record,
          _typesense: {
            highlights: hit.highlights || [],
            text_match: hit.text_match,
          },
        })
      } else {
        hydrated.push(hit.document)
      }
    }
    return hydrated
  } catch {
    return hits.map((h) => h.document)
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/typesense/*",
      middlewares: [
        (
          _req: MedusaRequest,
          res: MedusaResponse,
          next: MedusaNextFunction
        ) => {
          res.setHeader("X-Content-Type-Options", "nosniff")
          next()
        },
      ],
    },
    {
      matcher: "/admin/typesense/*",
      middlewares: [
        (
          _req: MedusaRequest,
          res: MedusaResponse,
          next: MedusaNextFunction
        ) => {
          res.setHeader("X-Content-Type-Options", "nosniff")
          res.setHeader("Cache-Control", "no-store")
          next()
        },
      ],
    },
  ],
})
