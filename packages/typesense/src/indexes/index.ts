import "@medusajs/framework/modules-sdk"
import type { Event, SearchTypes } from "@medusajs/framework/types"
import { defineSearchIndex, search } from "@medusajs/framework/utils"

if (typeof (globalThis as any).MedusaModule === "undefined") {
  ;(globalThis as any).MedusaModule = {
    setSearchIndex: () => {},
  }
} else if (
  typeof (globalThis as any).MedusaModule.setSearchIndex !== "function"
) {
  ;(globalThis as any).MedusaModule.setSearchIndex = () => {}
}
import { TYPESENSE_PROVIDER_IDENTIFIER } from "../providers/typesense"
import {
  DEFAULT_CATEGORY_GRAPH_FIELDS,
  DEFAULT_COLLECTION_GRAPH_FIELDS,
  DEFAULT_PRODUCT_GRAPH_FIELDS,
} from "../modules/typesense/utils/schemas"
import {
  transformCategoryToDocument,
  transformCollectionToDocument,
  transformCustomEntityToDocument,
  transformProductToDocument,
} from "../modules/typesense/utils/transformers"

export interface SearchIndexFactoryOptions<TDoc = Record<string, any>> {
  name?: string
  entity?: string
  provider?: string
  batchSize?: number
  graphFields?: string[]
  events?: string[]
  settings?: SearchTypes.SearchIndexSettings
  transform?: (record: Record<string, any>) => TDoc | null | Promise<TDoc | null>
  fields?: SearchTypes.SearchIndexFieldsInput
}

function createGraphSeedGenerator(params: {
  entity: string
  graphFields: string[]
  batchSize: number
  transform: (record: Record<string, any>) => any
}) {
  return async function* seed(
    context: SearchTypes.SearchSeedContext
  ): AsyncIterable<SearchTypes.SearchMutation[]> {
    const query = context.container?.query
    if (!query || typeof query.graph !== "function") {
      return
    }

    let offset = 0
    const take = params.batchSize

    while (true) {
      const filters: Record<string, any> = { ...(context.filters || {}) }
      if (context.catchup?.since) {
        filters.updated_at = { $gte: context.catchup.since.toISOString() }
      }

      const { data } = await query.graph({
        entity: params.entity,
        fields: params.graphFields,
        filters,
        pagination: {
          skip: offset,
          take,
        },
      })

      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) {
        break
      }

      const documents: SearchTypes.SearchDocument[] = []
      const deletedIds: string[] = []

      for (const row of rows) {
        if (!row?.id) continue
        if ((row as any).deleted_at) {
          deletedIds.push(String(row.id))
          continue
        }
        const transformed = await params.transform(row)
        if (transformed && transformed.id) {
          documents.push(transformed)
        }
      }

      const mutations: SearchTypes.SearchMutation[] = []
      if (documents.length > 0) {
        mutations.push({
          action: "upsert",
          documents,
        })
      }
      if (deletedIds.length > 0) {
        mutations.push({
          action: "delete",
          filters: { id: deletedIds },
        })
      }

      if (mutations.length > 0) {
        yield mutations
      }

      if (rows.length < take) {
        break
      }
      offset += take
    }
  }
}

function createGraphEventConsumer(params: {
  entity: string
  graphFields: string[]
  transform: (record: Record<string, any>) => any
}) {
  return async function consume(
    event: Event<any>,
    context: SearchTypes.SearchIngestionContext
  ): Promise<SearchTypes.SearchMutation[]> {
    const eventName = String(event?.name || "")
    const data = (event?.data || {}) as { id?: string; ids?: string[] }
    const ids = Array.isArray(data.ids)
      ? data.ids
      : data.id
        ? [data.id]
        : []

    if (ids.length === 0) {
      return []
    }

    if (eventName.endsWith(".deleted")) {
      return [
        {
          action: "delete",
          filters: { id: ids },
        },
      ]
    }

    const query = context.container?.query
    if (!query || typeof query.graph !== "function") {
      return []
    }

    const { data: rows } = await query.graph({
      entity: params.entity,
      fields: params.graphFields,
      filters: { id: ids },
    })

    const documents: SearchTypes.SearchDocument[] = []
    for (const row of Array.isArray(rows) ? rows : []) {
      const doc = await params.transform(row)
      if (doc && doc.id) {
        documents.push(doc)
      }
    }

    if (documents.length === 0) {
      return []
    }

    return [
      {
        action: "upsert",
        documents,
      },
    ]
  }
}

export const defaultProductSearchFields = search.define({
  title: search.text().searchable({ weight: 10 }).sortable(),
  subtitle: search.text().searchable({ weight: 7 }),
  description: search.text().searchable({ weight: 3 }),
  handle: search.keyword().searchable({ weight: 6 }).filterable().sortable(),
  status: search.keyword().filterable().facetable(),
  thumbnail: search.keyword(),
  is_giftcard: search.boolean().filterable().facetable(),
  discountable: search.boolean().filterable().facetable(),
  type_id: search.keyword().filterable().facetable(),
  type_value: search.keyword().searchable({ weight: 4 }).filterable().facetable(),
  collection_id: search.keyword().filterable().facetable(),
  collection_title: search.text().searchable({ weight: 5 }).filterable().facetable(),
  collection_handle: search.keyword().filterable().facetable(),
  category_ids: search.keyword().array().filterable().facetable(),
  category_names: search.text().array().searchable({ weight: 6 }).filterable().facetable(),
  category_handles: search.keyword().array().filterable().facetable(),
  tags: search.keyword().array().searchable({ weight: 5 }).filterable().facetable(),
  sales_channel_ids: search.keyword().array().filterable().facetable(),
  variant_skus: search.keyword().array().searchable({ weight: 9 }).filterable().facetable(),
  variant_titles: search.text().array().searchable({ weight: 4 }),
  option_values: search.keyword().array().searchable({ weight: 4 }).filterable().facetable(),
  options_kv: search.keyword().array().filterable().facetable(),
  min_price: search.float().filterable().sortable().facetable({ types: ["range", "stats"] }),
  max_price: search.float().filterable().sortable().facetable({ types: ["range", "stats"] }),
  in_stock: search.boolean().filterable().sortable().facetable(),
  inventory_quantity: search.integer().filterable().sortable(),
  created_at_ts: search.integer().filterable().sortable(),
  updated_at_ts: search.integer().filterable().sortable(),
})

export function defineProductSearchIndex(
  options: SearchIndexFactoryOptions = {}
): SearchTypes.SearchIndexDefinition {
  const entity = options.entity || "product"
  const graphFields = options.graphFields || DEFAULT_PRODUCT_GRAPH_FIELDS
  const transform =
    options.transform || ((rec) => transformProductToDocument(rec))

  return defineSearchIndex({
    name: options.name || "products",
    entity,
    provider: options.provider || TYPESENSE_PROVIDER_IDENTIFIER,
    fields: (options.fields || defaultProductSearchFields) as any,
    settings: options.settings,
    events: options.events || [
      "product.created",
      "product.updated",
      "product.deleted",
      "product-variant.created",
      "product-variant.updated",
      "product-variant.deleted",
    ],
    seed: createGraphSeedGenerator({
      entity,
      graphFields,
      batchSize: options.batchSize || 250,
      transform,
    }) as any,
    consume: createGraphEventConsumer({
      entity,
      graphFields,
      transform,
    }) as any,
  })
}

export const defaultCategorySearchFields = search.define({
  name: search.text().searchable({ weight: 10 }).sortable(),
  description: search.text().searchable({ weight: 4 }),
  handle: search.keyword().searchable({ weight: 7 }).filterable().sortable(),
  is_active: search.boolean().filterable().facetable(),
  is_internal: search.boolean().filterable().facetable(),
  rank: search.integer().filterable().sortable(),
  parent_category_id: search.keyword().filterable().facetable(),
  parent_category_name: search.text().searchable({ weight: 5 }).filterable().facetable(),
  breadcrumb_names: search.text().array().searchable({ weight: 5 }).filterable().facetable(),
  product_count: search.integer().filterable().sortable().facetable(),
  created_at_ts: search.integer().filterable().sortable(),
  updated_at_ts: search.integer().filterable().sortable(),
})

export function defineCategorySearchIndex(
  options: SearchIndexFactoryOptions = {}
): SearchTypes.SearchIndexDefinition {
  const entity = options.entity || "product_category"
  const graphFields = options.graphFields || DEFAULT_CATEGORY_GRAPH_FIELDS
  const transform =
    options.transform || ((rec) => transformCategoryToDocument(rec))

  return defineSearchIndex({
    name: options.name || "categories",
    entity,
    provider: options.provider || TYPESENSE_PROVIDER_IDENTIFIER,
    fields: (options.fields || defaultCategorySearchFields) as any,
    settings: options.settings,
    events: options.events || [
      "product-category.created",
      "product-category.updated",
      "product-category.deleted",
    ],
    seed: createGraphSeedGenerator({
      entity,
      graphFields,
      batchSize: options.batchSize || 250,
      transform,
    }) as any,
    consume: createGraphEventConsumer({
      entity,
      graphFields,
      transform,
    }) as any,
  })
}

export const defaultCollectionSearchFields = search.define({
  title: search.text().searchable({ weight: 10 }).sortable(),
  handle: search.keyword().searchable({ weight: 7 }).filterable().sortable(),
  product_count: search.integer().filterable().sortable().facetable(),
  created_at_ts: search.integer().filterable().sortable(),
  updated_at_ts: search.integer().filterable().sortable(),
})

export function defineCollectionSearchIndex(
  options: SearchIndexFactoryOptions = {}
): SearchTypes.SearchIndexDefinition {
  const entity = options.entity || "product_collection"
  const graphFields = options.graphFields || DEFAULT_COLLECTION_GRAPH_FIELDS
  const transform =
    options.transform || ((rec) => transformCollectionToDocument(rec))

  return defineSearchIndex({
    name: options.name || "collections",
    entity,
    provider: options.provider || TYPESENSE_PROVIDER_IDENTIFIER,
    fields: (options.fields || defaultCollectionSearchFields) as any,
    settings: options.settings,
    events: options.events || [
      "product-collection.created",
      "product-collection.updated",
      "product-collection.deleted",
    ],
    seed: createGraphSeedGenerator({
      entity,
      graphFields,
      batchSize: options.batchSize || 250,
      transform,
    }) as any,
    consume: createGraphEventConsumer({
      entity,
      graphFields,
      transform,
    }) as any,
  })
}

export const defaultCustomEntitySearchFields = search.define({
  title: search.text().searchable({ weight: 10 }).sortable(),
  name: search.text().searchable({ weight: 10 }).sortable(),
  description: search.text().searchable({ weight: 4 }),
  handle: search.keyword().searchable({ weight: 7 }).filterable().sortable(),
  slug: search.keyword().searchable({ weight: 7 }).filterable().sortable(),
  status: search.keyword().filterable().facetable(),
  is_active: search.boolean().filterable().facetable(),
  created_at_ts: search.integer().filterable().sortable(),
  updated_at_ts: search.integer().filterable().sortable(),
})

export function defineCustomSearchIndex(
  options: SearchIndexFactoryOptions & { name: string; entity: string }
): SearchTypes.SearchIndexDefinition {
  const entity = options.entity
  const graphFields = options.graphFields || ["*"]
  const transform =
    options.transform ||
    ((rec) => transformCustomEntityToDocument(rec, { entity: options.name }))

  return defineSearchIndex({
    name: options.name,
    entity,
    provider: options.provider || TYPESENSE_PROVIDER_IDENTIFIER,
    fields: (options.fields || defaultCustomEntitySearchFields) as any,
    settings: options.settings,
    events: options.events || [
      `${entity}.created`,
      `${entity}.updated`,
      `${entity}.deleted`,
    ],
    seed: createGraphSeedGenerator({
      entity,
      graphFields,
      batchSize: options.batchSize || 250,
      transform,
    }) as any,
    consume: createGraphEventConsumer({
      entity,
      graphFields,
      transform,
    }) as any,
  })
}
