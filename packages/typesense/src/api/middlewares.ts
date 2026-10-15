import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, QueryContext } from "@medusajs/framework/utils"

export * from "./validators"

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
