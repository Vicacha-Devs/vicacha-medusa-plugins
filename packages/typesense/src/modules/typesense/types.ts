export const TYPESENSE_MODULE = "typesense"

export const BUILT_IN_ENTITIES = ["products", "categories", "collections"] as const
export type BuiltInEntity = (typeof BUILT_IN_ENTITIES)[number]

export const SEARCH_MODES = ["keyword", "semantic", "hybrid", "conversational"] as const
export type SearchMode = (typeof SEARCH_MODES)[number]

export const SYNC_ACTIONS = [
  "full_reindex",
  "zero_downtime_swap",
  "incremental_upsert",
  "incremental_delete",
  "reconcile",
] as const
export type SyncAction = (typeof SYNC_ACTIONS)[number]

export const SYNC_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
] as const
export type SyncStatus = (typeof SYNC_STATUSES)[number]

export const EMBEDDER_PROVIDERS = [
  "ts/all-MiniLM-L6-v2",
  "ts/e5-small",
  "ts/multilingual-e5-small",
  "openai/text-embedding-3-small",
  "openai/text-embedding-3-large",
  "openai/text-embedding-ada-002",
  "gcp/textembedding-gecko",
  "custom",
] as const
export type EmbedderModelName = (typeof EMBEDDER_PROVIDERS)[number] | string

export interface TypesenseNodeConfig {
  host: string
  port: number
  protocol: "http" | "https"
  path?: string
}

export interface TypesenseEmbedderConfig {
  enabled: boolean
  field_name?: string
  embed_from?: string[]
  model_name: EmbedderModelName
  api_key?: string
  url?: string
  num_dim?: number
  indexing_prefix?: string
  query_prefix?: string
}

export interface TypesenseConversationalConfig {
  enabled: boolean
  id?: string
  model_name: string
  api_key?: string
  system_prompt?: string
  history_collection?: string
  max_bytes?: number
  ttl?: number
}

export type TypesenseFieldType =
  | "string"
  | "string[]"
  | "int32"
  | "int32[]"
  | "int64"
  | "int64[]"
  | "float"
  | "float[]"
  | "bool"
  | "bool[]"
  | "geopoint"
  | "geopoint[]"
  | "object"
  | "object[]"
  | "string*"
  | "image"
  | "auto"

export interface TypesenseSchemaField {
  name: string
  type: TypesenseFieldType
  facet?: boolean
  optional?: boolean
  index?: boolean
  sort?: boolean
  infix?: boolean
  locale?: string
  stem?: boolean
  store?: boolean
  num_dim?: number
  embed?: {
    from: string[]
    model_config: {
      model_name: string
      api_key?: string
      url?: string
      indexing_prefix?: string
      query_prefix?: string
    }
  }
}

export type DocumentTransformer<TInput = any, TOutput extends Record<string, any> = Record<string, any>> = (
  record: TInput,
  context?: { locale?: string; entity?: string }
) => TOutput | null | Promise<TOutput | null>

export interface TypesenseEntityDefinition {
  /** Logical entity key, e.g. 'products', 'categories', 'collections', 'brands', 'vendors' */
  entity: string
  /** Whether indexing is enabled for this entity */
  enabled?: boolean
  /** Medusa Remote Query graph entity name (e.g. 'product', 'product_category', 'product_collection', 'brand') */
  graphEntity?: string
  /** Fields to select from Medusa's query.graph */
  graphFields?: string[]
  /** Fields to search by default (query_by) */
  queryBy: string[]
  /** Optional relative weights for queryBy fields (e.g. [5, 3, 2, 1]) */
  queryByWeights?: number[]
  /** Facetable field names */
  facetBy?: string[]
  /** Default sort expression (e.g. 'created_at_ts:desc' or '_text_match:desc') */
  defaultSortBy?: string
  /** Enable Typesense nested object indexing */
  enableNestedFields?: boolean
  /** Custom token separators (e.g. ['-', '_', '/']) */
  tokenSeparators?: string[]
  /** Custom symbols to index (e.g. ['+', '#']) */
  symbolsToIndex?: string[]
  /** Vector / semantic auto-embedding configuration for this entity */
  embedder?: TypesenseEmbedderConfig | null
  /** Supported locales for localized collections (e.g. ['en', 'es', 'fr']) */
  locales?: string[]
  /** Stopword set ID attached to this entity collection */
  stopwordsSetId?: string | null
  /** Event names that trigger automatic sync (for custom entities) */
  events?: {
    created?: string | string[]
    updated?: string | string[]
    deleted?: string | string[]
  }
  /** Explicit Typesense schema fields */
  schemaFields?: TypesenseSchemaField[]
  /** Custom document transformation hook */
  transformer?: DocumentTransformer
  /** Enforced storefront filter constraint (e.g. 'status:=published') */
  storefrontFilterConstraint?: string
}

export interface TypesensePluginOptions {
  /** Typesense cluster nodes (defaults to localhost:8108 over http) */
  nodes?: TypesenseNodeConfig[]
  /** Optional nearest node for load-balanced Typesense Cloud clusters */
  nearestNode?: TypesenseNodeConfig
  /** Shortcut host URL (e.g. 'http://localhost:8108' or 'https://xxx.a1.typesense.net:443') */
  host?: string
  /** Admin / Master API key for indexing and schema management */
  apiKey?: string
  /** Search-Only API key used as parent key for generating scoped storefront tokens */
  searchOnlyApiKey?: string
  /** Connection timeout in seconds (default: 10) */
  connectionTimeoutSeconds?: number
  /** Number of retries (default: 3) */
  numRetries?: number
  /** Retry interval in seconds (default: 0.5) */
  retryIntervalSeconds?: number
  /** Prefix for all Typesense collections and aliases (default: 'medusa') */
  collectionPrefix?: string
  /** Batch size when importing documents (default: 250) */
  batchSize?: number
  /** Automatically index catalog changes from Medusa events (default: true) */
  autoIndex?: boolean
  /** Use zero-downtime collection alias swaps on full reindex (default: true) */
  zeroDowntimeSwap?: boolean
  /** Number of old timestamped physical collections to retain for rollback (default: 1) */
  keepOldCollectionsCount?: number
  /** Default locale (default: 'en') */
  defaultLocale?: string
  /** Multi-locale list (if >1, creates per-locale collections or localized fields) */
  locales?: string[]
  /** Global default vector / hybrid embedder config */
  embedder?: TypesenseEmbedderConfig
  /** Conversational RAG model config */
  conversationalModel?: TypesenseConversationalConfig
  /** Default TTL in seconds for generated scoped storefront API keys (default: 3600) */
  scopedKeyTtlSeconds?: number
  /** Override built-in entity definitions ('products', 'categories', 'collections') */
  entities?: Partial<Record<BuiltInEntity, Partial<TypesenseEntityDefinition>>>
  /** Register custom indexable entities (e.g. 'brands', 'vendors', 'reviews', 'articles') */
  customEntities?: Record<string, Partial<TypesenseEntityDefinition>>
  /** Enable local + Typesense search analytics tracking (default: true) */
  enableAnalytics?: boolean
}

export interface TypesenseProductDocument {
  id: string
  title: string
  subtitle: string
  description: string
  handle: string
  status: string
  thumbnail: string
  is_giftcard: boolean
  discountable: boolean
  type_id: string
  type_value: string
  collection_id: string
  collection_title: string
  collection_handle: string
  collection_ids: string[]
  category_ids: string[]
  category_names: string[]
  category_handles: string[]
  tags: string[]
  tag_ids: string[]
  sales_channel_ids: string[]
  variant_ids: string[]
  variant_titles: string[]
  variant_skus: string[]
  variant_barcodes: string[]
  option_names: string[]
  option_values: string[]
  options_kv: string[]
  currencies: string[]
  prices: Record<string, number>
  min_price: number
  max_price: number
  in_stock: boolean
  inventory_quantity: number
  weight: number
  origin_country: string
  material: string
  hs_code: string
  mid_code: string
  locale: string
  created_at_ts: number
  updated_at_ts: number
  metadata?: Record<string, any>
  embedding?: number[]
  [key: string]: any
}

export interface TypesenseCategoryDocument {
  id: string
  name: string
  description: string
  handle: string
  is_active: boolean
  is_internal: boolean
  rank: number
  parent_category_id: string
  parent_category_name: string
  mpath: string
  breadcrumb_names: string[]
  breadcrumb_handles: string[]
  child_category_ids: string[]
  product_count: number
  locale: string
  created_at_ts: number
  updated_at_ts: number
  metadata?: Record<string, any>
  embedding?: number[]
  [key: string]: any
}

export interface TypesenseCollectionDocument {
  id: string
  title: string
  handle: string
  product_count: number
  locale: string
  created_at_ts: number
  updated_at_ts: number
  metadata?: Record<string, any>
  embedding?: number[]
  [key: string]: any
}

export interface TypesenseRangeFacetSpec {
  field: string
  ranges: Array<{ label: string; from?: number; to?: number }>
}

export interface TypesenseSearchParams {
  /** Entity name ('products', 'categories', 'collections', or custom entity) */
  entity?: string
  /** Search query string ('*' for browse/filter all) */
  q?: string
  /** Search mode: 'keyword' | 'semantic' | 'hybrid' | 'conversational' */
  mode?: SearchMode
  /** Hybrid search alpha parameter (0.0 = pure keyword, 1.0 = pure vector, default: 0.3) */
  alpha?: number
  /** Pre-computed query vector if not using Typesense auto-embedding */
  vector?: number[]
  /** Vector field name (default: 'embedding') */
  vectorField?: string
  /** Structured filter object or raw Typesense filter_by string */
  filters?: Record<string, any>
  /** Explicit Typesense filter_by string */
  filterBy?: string
  /** Fields to query (overrides entity default) */
  queryBy?: string[]
  /** Weights for queryBy fields */
  queryByWeights?: number[]
  /** Fields to facet on */
  facets?: string[]
  /** Range facets specification */
  rangeFacets?: TypesenseRangeFacetSpec[]
  /** Enable disjunctive faceting (multi-search to preserve sibling facet counts) */
  disjunctiveFacets?: boolean
  /** Max facet values per field (default: 50) */
  maxFacetValues?: number
  /** Sort expression (e.g. 'min_price:asc,created_at_ts:desc') */
  sortBy?: string
  /** Group results by field (e.g. 'collection_id') */
  groupBy?: string
  /** Group limit (default: 3) */
  groupLimit?: number
  /** Fields to highlight */
  highlightFields?: string[]
  /** Highlight start tag (default: '<mark>') */
  highlightStartTag?: string
  /** Highlight end tag (default: '</mark>') */
  highlightEndTag?: string
  /** Number of typos allowed (0, 1, or 2; default: 2) */
  numTypos?: number
  /** Prefix matching (default: true) */
  prefix?: boolean
  /** Page number (1-indexed) */
  page?: number
  /** Page size / limit (default: 20) */
  limit?: number
  /** Offset (0-indexed; overrides page if provided) */
  offset?: number
  /** Locale code (e.g. 'en', 'es') */
  locale?: string
  /** Enforced sales channel IDs (injected automatically for storefront requests) */
  salesChannelIds?: string[]
  /** Enforce storefront visibility filters (status:=published, is_active:=true, etc.) */
  enforceStorefrontVisibility?: boolean
  /** Conversational search conversation_id (for multi-turn RAG) */
  conversationId?: string
  /** Conversational model ID override */
  conversationModelId?: string
  /** Pin specific document IDs at positions (e.g. 'prod_1:1,prod_2:2') */
  pinnedHits?: string
  /** Hide specific document IDs (e.g. 'prod_9,prod_10') */
  hiddenHits?: string
  /** Enable/disable overrides/curations for this query (default: true) */
  enableOverrides?: boolean
  /** Enable/disable synonyms for this query (default: true) */
  enableSynonyms?: boolean
  /** Stopwords set ID override */
  stopwords?: string
  /** Raw Typesense search parameter overrides */
  rawParams?: Record<string, any>
  /** Track query in analytics (default: true) */
  trackAnalytics?: boolean
}

export interface TypesenseFacetCountItem {
  value: string
  count: number
  highlighted?: string
}

export interface TypesenseFacetStats {
  min?: number
  max?: number
  avg?: number
  sum?: number
  total_values?: number
}

export interface TypesenseFacetDistribution {
  field_name: string
  counts: TypesenseFacetCountItem[]
  stats?: TypesenseFacetStats
}

export interface TypesenseSearchHit<T = Record<string, any>> {
  document: T
  highlights: Array<{
    field: string
    snippet?: string
    snippets?: string[]
    matched_tokens?: string[] | string[][]
  }>
  text_match?: number
  vector_distance?: number
  hybrid_search_info?: {
    rank_fusion_score?: number
  }
  curated?: boolean
}

export interface TypesenseSearchResponse<T = Record<string, any>> {
  entity: string
  collection: string
  mode: SearchMode
  query: string
  hits: TypesenseSearchHit<T>[]
  documents: T[]
  found: number
  out_of: number
  page: number
  limit: number
  offset: number
  search_time_ms: number
  facets: TypesenseFacetDistribution[]
  conversation?: {
    answer: string
    conversation_id: string
    query: string
    context_documents?: string[]
  }
}

export interface TypesenseSynonymInput {
  id: string
  synonyms: string[]
  root?: string
  locale?: string
  symbols_to_index?: string[]
}

export interface TypesenseCurationInput {
  id: string
  rule: {
    query?: string
    match?: "exact" | "contains"
    filter_by?: string
    tags?: string[]
  }
  includes?: Array<{ id: string; position: number }>
  excludes?: Array<{ id: string }>
  filter_by?: string
  sort_by?: string
  replace_query?: string
  remove_matched_tokens?: boolean
  filter_curated_hits?: boolean
  effective_from_ts?: number
  effective_to_ts?: number
  stop_processing?: boolean
  metadata?: Record<string, any>
}

export interface TypesenseStopwordSetInput {
  id: string
  stopwords: string[]
  locale?: string
}

export interface TypesenseScopedKeyInput {
  salesChannelIds?: string[]
  entities?: string[]
  locale?: string
  additionalFilterBy?: string
  expiresInSeconds?: number
  limitMultiSearches?: number
}
