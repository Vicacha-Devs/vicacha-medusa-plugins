import type {
  TypesenseEmbedderConfig,
  TypesenseEntityDefinition,
  TypesenseSchemaField,
} from "../types"

export const DEFAULT_PRODUCT_GRAPH_FIELDS: string[] = [
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
  "hs_code",
  "mid_code",
  "created_at",
  "updated_at",
  "metadata",
  "type.id",
  "type.value",
  "collection.id",
  "collection.title",
  "collection.handle",
  "categories.id",
  "categories.name",
  "categories.handle",
  "tags.id",
  "tags.value",
  "sales_channels.id",
  "options.id",
  "options.title",
  "options.values.id",
  "options.values.value",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.barcode",
  "variants.ean",
  "variants.upc",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.inventory_quantity",
  "variants.options.value",
  "variants.options.option.title",
  "variants.prices.amount",
  "variants.prices.currency_code",
]

export const DEFAULT_CATEGORY_GRAPH_FIELDS: string[] = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "is_internal",
  "rank",
  "mpath",
  "parent_category_id",
  "parent_category.id",
  "parent_category.name",
  "parent_category.handle",
  "category_children.id",
  "category_children.name",
  "category_children.handle",
  "products.id",
  "created_at",
  "updated_at",
  "metadata",
]

export const DEFAULT_COLLECTION_GRAPH_FIELDS: string[] = [
  "id",
  "title",
  "handle",
  "products.id",
  "created_at",
  "updated_at",
  "metadata",
]

export const DEFAULT_PRODUCT_SCHEMA_FIELDS: TypesenseSchemaField[] = [
  { name: "id", type: "string", facet: false },
  { name: "title", type: "string", facet: false, sort: true, infix: true, stem: true },
  { name: "subtitle", type: "string", optional: true, stem: true },
  { name: "description", type: "string", optional: true, stem: true },
  { name: "handle", type: "string", optional: true, facet: false, sort: true, infix: true },
  { name: "status", type: "string", facet: true, optional: true },
  { name: "thumbnail", type: "string", optional: true, index: false },
  { name: "is_giftcard", type: "bool", facet: true, optional: true },
  { name: "discountable", type: "bool", facet: true, optional: true },
  { name: "type_id", type: "string", facet: true, optional: true },
  { name: "type_value", type: "string", facet: true, optional: true },
  { name: "collection_id", type: "string", facet: true, optional: true },
  { name: "collection_title", type: "string", facet: true, optional: true },
  { name: "collection_handle", type: "string", facet: true, optional: true },
  { name: "collection_ids", type: "string[]", facet: true, optional: true },
  { name: "category_ids", type: "string[]", facet: true, optional: true },
  { name: "category_names", type: "string[]", facet: true, optional: true },
  { name: "category_handles", type: "string[]", facet: true, optional: true },
  { name: "tags", type: "string[]", facet: true, optional: true },
  { name: "tag_ids", type: "string[]", facet: true, optional: true },
  { name: "sales_channel_ids", type: "string[]", facet: true, optional: true },
  { name: "variant_ids", type: "string[]", optional: true },
  { name: "variant_titles", type: "string[]", optional: true },
  { name: "variant_skus", type: "string[]", facet: true, optional: true, infix: true },
  { name: "variant_barcodes", type: "string[]", optional: true, infix: true },
  { name: "option_names", type: "string[]", facet: true, optional: true },
  { name: "option_values", type: "string[]", facet: true, optional: true },
  { name: "options_kv", type: "string[]", facet: true, optional: true },
  { name: "currencies", type: "string[]", facet: true, optional: true },
  { name: "prices", type: "object", optional: true },
  { name: "min_price", type: "float", facet: true, sort: true, optional: true },
  { name: "max_price", type: "float", facet: true, sort: true, optional: true },
  { name: "in_stock", type: "bool", facet: true, sort: true, optional: true },
  { name: "inventory_quantity", type: "int32", sort: true, optional: true },
  { name: "weight", type: "float", sort: true, optional: true },
  { name: "origin_country", type: "string", facet: true, optional: true },
  { name: "material", type: "string", facet: true, optional: true },
  { name: "hs_code", type: "string", optional: true },
  { name: "mid_code", type: "string", optional: true },
  { name: "locale", type: "string", facet: true, optional: true },
  { name: "created_at_ts", type: "int64", sort: true },
  { name: "updated_at_ts", type: "int64", sort: true },
  { name: "metadata", type: "object", optional: true },
  { name: ".*", type: "auto", optional: true },
]

export const DEFAULT_CATEGORY_SCHEMA_FIELDS: TypesenseSchemaField[] = [
  { name: "id", type: "string", facet: false },
  { name: "name", type: "string", sort: true, infix: true, stem: true },
  { name: "description", type: "string", optional: true, stem: true },
  { name: "handle", type: "string", sort: true, infix: true },
  { name: "is_active", type: "bool", facet: true, optional: true },
  { name: "is_internal", type: "bool", facet: true, optional: true },
  { name: "rank", type: "int32", sort: true, optional: true },
  { name: "parent_category_id", type: "string", facet: true, optional: true },
  { name: "parent_category_name", type: "string", facet: true, optional: true },
  { name: "mpath", type: "string", optional: true },
  { name: "breadcrumb_names", type: "string[]", facet: true, optional: true },
  { name: "breadcrumb_handles", type: "string[]", facet: true, optional: true },
  { name: "child_category_ids", type: "string[]", optional: true },
  { name: "product_count", type: "int32", facet: true, sort: true, optional: true },
  { name: "locale", type: "string", facet: true, optional: true },
  { name: "created_at_ts", type: "int64", sort: true },
  { name: "updated_at_ts", type: "int64", sort: true },
  { name: "metadata", type: "object", optional: true },
  { name: ".*", type: "auto", optional: true },
]

export const DEFAULT_COLLECTION_SCHEMA_FIELDS: TypesenseSchemaField[] = [
  { name: "id", type: "string", facet: false },
  { name: "title", type: "string", sort: true, infix: true, stem: true },
  { name: "handle", type: "string", sort: true, infix: true },
  { name: "product_count", type: "int32", facet: true, sort: true, optional: true },
  { name: "locale", type: "string", facet: true, optional: true },
  { name: "created_at_ts", type: "int64", sort: true },
  { name: "updated_at_ts", type: "int64", sort: true },
  { name: "metadata", type: "object", optional: true },
  { name: ".*", type: "auto", optional: true },
]

export const DEFAULT_CUSTOM_ENTITY_SCHEMA_FIELDS: TypesenseSchemaField[] = [
  { name: "id", type: "string", facet: false },
  { name: "title", type: "string", optional: true, sort: true, infix: true, stem: true },
  { name: "name", type: "string", optional: true, sort: true, infix: true, stem: true },
  { name: "description", type: "string", optional: true, stem: true },
  { name: "handle", type: "string", optional: true, sort: true, infix: true },
  { name: "slug", type: "string", optional: true, sort: true, infix: true },
  { name: "status", type: "string", facet: true, optional: true },
  { name: "is_active", type: "bool", facet: true, optional: true },
  { name: "locale", type: "string", facet: true, optional: true },
  { name: "created_at_ts", type: "int64", sort: true, optional: true },
  { name: "updated_at_ts", type: "int64", sort: true, optional: true },
  { name: "metadata", type: "object", optional: true },
  { name: ".*", type: "auto", optional: true },
]

export function getBuiltInEntityDefaults(entity: string): TypesenseEntityDefinition {
  if (entity === "products") {
    return {
      entity: "products",
      enabled: true,
      graphEntity: "product",
      graphFields: DEFAULT_PRODUCT_GRAPH_FIELDS,
      queryBy: [
        "title",
        "subtitle",
        "variant_skus",
        "category_names",
        "collection_title",
        "tags",
        "description",
        "option_values",
        "material",
      ],
      queryByWeights: [10, 7, 9, 6, 5, 5, 3, 4, 2],
      facetBy: [
        "category_names",
        "category_handles",
        "collection_title",
        "tags",
        "option_values",
        "options_kv",
        "in_stock",
        "min_price",
        "type_value",
        "material",
        "origin_country",
      ],
      defaultSortBy: "created_at_ts:desc",
      enableNestedFields: true,
      tokenSeparators: ["-", "_", "/"],
      schemaFields: DEFAULT_PRODUCT_SCHEMA_FIELDS,
      storefrontFilterConstraint: "status:=published",
      events: {
        created: ["product.created", "product-variant.created"],
        updated: ["product.updated", "product-variant.updated"],
        deleted: ["product.deleted", "product-variant.deleted"],
      },
    }
  }

  if (entity === "categories") {
    return {
      entity: "categories",
      enabled: true,
      graphEntity: "product_category",
      graphFields: DEFAULT_CATEGORY_GRAPH_FIELDS,
      queryBy: ["name", "handle", "description", "breadcrumb_names"],
      queryByWeights: [10, 7, 4, 5],
      facetBy: ["parent_category_name", "is_active"],
      defaultSortBy: "rank:asc",
      enableNestedFields: true,
      tokenSeparators: ["-", "_", "/"],
      schemaFields: DEFAULT_CATEGORY_SCHEMA_FIELDS,
      storefrontFilterConstraint: "is_active:=true && is_internal:=false",
      events: {
        created: "product-category.created",
        updated: "product-category.updated",
        deleted: "product-category.deleted",
      },
    }
  }

  if (entity === "collections") {
    return {
      entity: "collections",
      enabled: true,
      graphEntity: "product_collection",
      graphFields: DEFAULT_COLLECTION_GRAPH_FIELDS,
      queryBy: ["title", "handle"],
      queryByWeights: [10, 7],
      facetBy: [],
      defaultSortBy: "created_at_ts:desc",
      enableNestedFields: true,
      tokenSeparators: ["-", "_", "/"],
      schemaFields: DEFAULT_COLLECTION_SCHEMA_FIELDS,
      events: {
        created: "product-collection.created",
        updated: "product-collection.updated",
        deleted: "product-collection.deleted",
      },
    }
  }

  return {
    entity,
    enabled: true,
    graphEntity: entity.replace(/s$/, ""),
    graphFields: ["*"],
    queryBy: ["title", "name", "handle", "slug", "description"],
    queryByWeights: [10, 10, 7, 7, 4],
    facetBy: ["status", "is_active"],
    defaultSortBy: "created_at_ts:desc",
    enableNestedFields: true,
    tokenSeparators: ["-", "_", "/"],
    schemaFields: DEFAULT_CUSTOM_ENTITY_SCHEMA_FIELDS,
    events: {
      created: `${entity.replace(/s$/, "")}.created`,
      updated: `${entity.replace(/s$/, "")}.updated`,
      deleted: `${entity.replace(/s$/, "")}.deleted`,
    },
  }
}

export function buildTypesenseCollectionSchema(params: {
  collectionName: string
  definition: TypesenseEntityDefinition
  globalEmbedder?: TypesenseEmbedderConfig
  locale?: string
}): Record<string, any> {
  const { collectionName, definition, globalEmbedder, locale } = params
  const baseFields = definition.schemaFields?.length
    ? [...definition.schemaFields]
    : [...getBuiltInEntityDefaults(definition.entity).schemaFields!]

  const normalizedLocale =
    locale && locale !== "en" ? locale.split("-")[0].toLowerCase() : undefined

  const fields: Record<string, any>[] = baseFields
    .filter((f) => f.name !== "id")
    .map((field) => {
      const cloned: Record<string, any> = { ...field }
      if (
        normalizedLocale &&
        (field.type === "string" || field.type === "string[]") &&
        field.index !== false &&
        !cloned.locale
      ) {
        cloned.locale = normalizedLocale
      }
      return cloned
    })

  const activeEmbedder =
    definition.embedder !== undefined ? definition.embedder : globalEmbedder

  if (activeEmbedder?.enabled && activeEmbedder.model_name) {
    const vectorFieldName = activeEmbedder.field_name || "embedding"
    const alreadyExists = fields.some((f) => f.name === vectorFieldName)

    if (!alreadyExists) {
      const embedFrom =
        activeEmbedder.embed_from && activeEmbedder.embed_from.length > 0
          ? activeEmbedder.embed_from
          : definition.queryBy.filter((f) =>
              fields.some(
                (sf) =>
                  sf.name === f &&
                  (sf.type === "string" || sf.type === "string[]")
              )
            )

      if (embedFrom.length > 0 && activeEmbedder.model_name !== "custom") {
        const modelConfig: Record<string, any> = {
          model_name: activeEmbedder.model_name,
        }
        if (activeEmbedder.api_key) {
          modelConfig.api_key = activeEmbedder.api_key
        }
        if (activeEmbedder.url) {
          modelConfig.url = activeEmbedder.url
        }
        if (activeEmbedder.indexing_prefix) {
          modelConfig.indexing_prefix = activeEmbedder.indexing_prefix
        }
        if (activeEmbedder.query_prefix) {
          modelConfig.query_prefix = activeEmbedder.query_prefix
        }

        fields.push({
          name: vectorFieldName,
          type: "float[]",
          embed: {
            from: embedFrom,
            model_config: modelConfig,
          },
        })
      } else if (activeEmbedder.num_dim && activeEmbedder.num_dim > 0) {
        fields.push({
          name: vectorFieldName,
          type: "float[]",
          num_dim: activeEmbedder.num_dim,
          optional: true,
        })
      }
    }
  }

  const schema: Record<string, any> = {
    name: collectionName,
    enable_nested_fields: definition.enableNestedFields !== false,
    fields,
  }

  if (
    definition.defaultSortBy &&
    !definition.defaultSortBy.includes(",") &&
    !definition.defaultSortBy.startsWith("_")
  ) {
    const defaultSortField = definition.defaultSortBy.split(":")[0].trim()
    if (fields.some((f) => f.name === defaultSortField && f.sort === true)) {
      schema.default_sorting_field = defaultSortField
    }
  }

  if (definition.tokenSeparators?.length) {
    schema.token_separators = definition.tokenSeparators
  }
  if (definition.symbolsToIndex?.length) {
    schema.symbols_to_index = definition.symbolsToIndex
  }

  return schema
}
