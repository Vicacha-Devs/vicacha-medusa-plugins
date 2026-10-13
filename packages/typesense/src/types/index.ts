export * from "./constants"
export * from "./enums"
export * from "./errors"

import type {
  BUILT_IN_ENTITIES,
  EMBEDDER_PROVIDERS,
  SEARCH_MODES,
  SYNC_ACTIONS,
  SYNC_STATUSES,
  TYPESENSE_TAB_KEYS,
} from "./constants"
import type { SearchTypes } from "@medusajs/framework/types"
import type { TypesenseApiClient } from "../sdk/client"

// ─────────────────────────────────────────────────────────────────────────────
// 1. Core Plugin Configuration & Utils
// ─────────────────────────────────────────────────────────────────────────────

export type BuiltInEntity = (typeof BUILT_IN_ENTITIES)[number]
export type SearchMode = (typeof SEARCH_MODES)[number]
export type SyncAction = (typeof SYNC_ACTIONS)[number]
export type SyncStatus = (typeof SYNC_STATUSES)[number]
export type EmbedderModelName = (typeof EMBEDDER_PROVIDERS)[number] | string
export type TypesenseTabKey = (typeof TYPESENSE_TAB_KEYS)[number]

export interface MappedTypesenseError {
  code: string
  message: string
  retryable: boolean
}

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

export type DocumentTransformer<
  TInput = any,
  TOutput extends Record<string, any> = Record<string, any>,
> = (
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. Domain / Module Schemas & Document Models
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 3. Internal / Search Engine & Merchandising Payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface TypesenseRangeFacetSpec {
  field: string
  ranges: Array<{ label: string; from?: number; to?: number }>
}

export type RangeFacetDefinition = TypesenseRangeFacetSpec

export interface TypesenseSearchParams {
  entity?: string
  q?: string
  mode?: SearchMode
  alpha?: number
  vector?: number[]
  vectorField?: string
  filters?: Record<string, any>
  filterBy?: string
  queryBy?: string[]
  queryByWeights?: number[]
  facets?: string[]
  rangeFacets?: TypesenseRangeFacetSpec[]
  disjunctiveFacets?: boolean
  maxFacetValues?: number
  sortBy?: string
  groupBy?: string
  groupLimit?: number
  highlightFields?: string[]
  highlightStartTag?: string
  highlightEndTag?: string
  numTypos?: number
  prefix?: boolean
  page?: number
  limit?: number
  offset?: number
  locale?: string
  salesChannelIds?: string[]
  enforceStorefrontVisibility?: boolean
  conversationId?: string
  conversationModelId?: string
  pinnedHits?: string
  hiddenHits?: string
  enableOverrides?: boolean
  enableSynonyms?: boolean
  stopwords?: string
  rawParams?: Record<string, any>
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

export type SearchExecutionResult<T = Record<string, any>> =
  TypesenseSearchResponse<T>

export interface FederatedSearchResult {
  results: Record<string, TypesenseSearchResponse<any>>
  total_time_ms?: number
  [key: string]: any
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

export interface TypesenseSearchProviderOptions {
  nodes?: TypesenseNodeConfig[]
  nearestNode?: TypesenseNodeConfig
  host?: string
  apiKey?: string
  connectionTimeoutSeconds?: number
  numRetries?: number
  retryIntervalSeconds?: number
  config?: {
    nodes?: TypesenseNodeConfig[]
    nearestNode?: TypesenseNodeConfig
    host?: string
    apiKey?: string
    connectionTimeoutSeconds?: number
    numRetries?: number
    retryIntervalSeconds?: number
  }
}

export interface SearchIndexFactoryOptions<TDoc = Record<string, any>> {
  name?: string
  entity?: string
  provider?: string
  batchSize?: number
  graphFields?: string[]
  events?: string[]
  settings?: SearchTypes.SearchIndexSettings
  transform?: (
    record: Record<string, any>
  ) => TDoc | null | Promise<TDoc | null>
  fields?: SearchTypes.SearchIndexFieldsInput
}

export interface SyncEntitiesWorkflowInput {
  /** Single entity or array of entities ('products', 'categories', 'collections', or custom entities). If omitted, syncs all enabled entities. */
  entities?: string[]
  /** Specific record IDs to sync incrementally. If omitted, performs a full zero-downtime reindex. */
  ids?: string[]
  /** Specific locale override. If omitted, syncs all configured locales. */
  locale?: string
  /** Force full zero-downtime reindex even if IDs are not passed (default: true when ids omitted) */
  fullReindex?: boolean
  /** Actor or trigger source ('admin', 'cli', 'job', 'event') */
  triggeredBy?: string
}

export interface SyncEntitySummary {
  entity: string
  locale: string
  aliasName: string
  collectionName: string
  documentsProcessed: number
  documentsFailed: number
  durationMs: number
}

export interface UpsertTypesenseDocumentsInput {
  entity: string
  ids?: string[]
  records?: Record<string, any>[]
  locale?: string
  triggeredBy?: string
}

export interface DeleteTypesenseDocumentsInput {
  entity: string
  ids: string[]
  locale?: string
  triggeredBy?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Plugin Admin & Store SDK
// ─────────────────────────────────────────────────────────────────────────────

export interface TypesenseApiClientOptions {
  headers?: Record<string, string>
  publishableApiKey?: string
  credentials?: RequestCredentials
  fetchImpl?: typeof fetch
}

export interface TypesenseNodeInfo {
  host: string
  port: number
  protocol: string
}

export interface CollectionOverviewItem {
  entity: string
  enabled: boolean
  isCustom: boolean
  aliasName: string
  physicalCollection: string | null
  numDocuments: number
  numFields: number
  hasVectorEmbedder: boolean
  embedderModel: string | null
  synonymsCount: number
  curationsCount: number
}

export type CollectionStats = CollectionOverviewItem

export interface SyncJobItem {
  id: string
  entity: string
  collection_name: string
  alias_name: string | null
  locale: string
  action: string
  status: string
  documents_processed: number
  documents_failed: number
  duration_ms: number | null
  triggered_by: string
  error_message: string | null
  created_at: string
}

export interface SynonymItem {
  id: string
  root?: string
  synonyms: string[]
  locale?: string
}

export type SynonymConfig = SynonymItem

export interface CurationItem {
  id: string
  rule?: {
    query: string
    match: "exact" | "contains"
    filter_by?: string
  }
  includes?: Array<{ id: string; position: number }>
  excludes?: Array<{ id: string }>
  metadata?: Record<string, any>
}

export type CurationConfig = CurationItem

export interface StopwordSetItem {
  id: string
  stopwords: string[]
  locale?: string
}

export type StopwordsSetConfig = StopwordSetItem

export interface PlaygroundFacetCount {
  value: string
  count: number
}

export interface PlaygroundFacetGroup {
  field_name: string
  counts?: PlaygroundFacetCount[]
}

export interface PlaygroundHit {
  document?: Record<string, any>
  highlights?: Array<{ field?: string; snippet?: string }>
  curated?: boolean
}

export interface PlaygroundResponse {
  found: number
  search_time_ms: number
  collection: string
  facets?: PlaygroundFacetGroup[]
  hits?: PlaygroundHit[]
  conversation?: {
    answer?: string
    conversation_id?: string
  }
}

export interface PopularQueryMetric {
  query: string
  count: number
  avgResults: number
  clicks: number
}

export interface NoHitQueryMetric {
  query: string
  count: number
}

export interface AnalyticsSummary {
  totalSearches: number
  noHitRate: number
  clickThroughRate: number
  conversionRate: number
  averageLatencyMs: number
  popularQueries?: PopularQueryMetric[]
  noHitQueries?: NoHitQueryMetric[]
}

export interface EntityConfigPayload {
  entity: string
  enabled?: boolean
  isCustom?: boolean
  graphEntity?: string
  graphFields?: string[]
  queryBy?: string[]
  queryByWeights?: number[]
  facetBy?: string[]
  defaultSortBy?: string
  enableNestedFields?: boolean
  embedder?: Partial<TypesenseEmbedderConfig> | null
  schemaFields?: TypesenseSchemaField[]
  storefrontFilterConstraint?: string
  [key: string]: any
}

export interface DocumentInspectResult {
  exists_in_typesense: boolean
  collection_name?: string
  typesense_document?: Record<string, any> | null
  transformed_preview?: Record<string, any> | null
  [key: string]: any
}

export interface TypesenseHealthResponse {
  status: string
  healthy: boolean
  active_node?: string
  latency_ms?: number
  circuit_breaker_open?: boolean
  [key: string]: any
}

export interface TypesenseCollectionsResponse {
  collections: CollectionStats[]
  recent_logs: Array<{
    id: string
    entity_type: string
    action: string
    status: string
    documents_processed: number
    documents_failed: number
    duration_ms: number
    created_at: string
  }>
}

export interface SyncCollectionsPayload {
  recreate?: boolean
  zero_downtime?: boolean
}

export interface SyncAllCollectionsResponse {
  results: Array<{
    entity: string
    collection: string
    processed: number
    failed: number
    duration_ms?: number
  }>
}

export interface SyncEntityCollectionResponse {
  entity?: string
  collection?: string
  processed: number
  failed: number
  duration_ms?: number
  [key: string]: any
}

export interface TypesenseEntitiesResponse {
  entities: EntityConfigPayload[]
}

export interface UpsertEntityConfigResponse {
  entity: EntityConfigPayload
}

export interface DeleteCustomEntityResponse {
  deleted: boolean
  entity?: string
}

export interface TypesenseSynonymsResponse {
  synonyms: SynonymConfig[]
}

export interface UpsertSynonymPayload {
  id: string
  synonyms: string[]
  root?: string
  locale?: string
}

export interface TypesenseCurationsResponse {
  curations: CurationConfig[]
}

export interface UpsertCurationPayload {
  id: string
  rule: {
    query: string
    match: "exact" | "contains"
    filter_by?: string
  }
  includes?: Array<{ id: string; position: number }>
  excludes?: Array<{ id: string }>
  filter_curated_hits?: boolean
  remove_matched_tokens?: boolean
  stop_processing?: boolean
}

export interface TypesenseStopwordsResponse {
  stopwords: StopwordsSetConfig[]
}

export interface UpsertStopwordsPayload {
  id: string
  stopwords: string[]
  locale?: string
}

export interface PlaygroundSearchPayload {
  entity: string
  q: string
  mode?: SearchMode
  alpha?: number
  locale?: string
  facets?: string[]
  disjunctive_facets?: boolean
  filters?: Record<string, any>
  sort_by?: string
  limit?: number
  page?: number
}

export interface SyncSingleDocumentResponse {
  synced: boolean
  entity: string
  id: string
  collection?: string
}

export interface DeleteSingleDocumentResponse {
  deleted: boolean
  entity: string
  id: string
}

export interface StoreSearchQueryParams {
  entity?: string
  q?: string
  mode?: SearchMode
  alpha?: number
  vector?: number[]
  vector_field?: string
  filters?: Record<string, any>
  facets?: string | string[]
  range_facets?: RangeFacetDefinition[]
  disjunctive_facets?: boolean
  sort_by?: string
  group_by?: string
  group_limit?: number
  highlight_fields?: string | string[]
  num_typos?: number
  page?: number
  limit?: number
  offset?: number
  locale?: string
  sales_channel_id?: string | string[]
  conversation_id?: string
}

export interface StoreFederatedSearchPayload {
  queries: Array<{
    entity: string
    q?: string
    mode?: SearchMode
    alpha?: number
    filters?: Record<string, any>
    facets?: string[]
    range_facets?: RangeFacetDefinition[]
    disjunctive_facets?: boolean
    sort_by?: string
    limit?: number
    page?: number
    offset?: number
    locale?: string
  }>
  sales_channel_id?: string | string[]
}

export interface StoreScopedTokenParams {
  entities?: string | string[]
  locale?: string
  expires_in?: number
  sales_channel_id?: string | string[]
}

export interface StoreScopedTokenResponse {
  scoped_api_key: string
  collections: Record<string, string>
  filter_by: string
  expires_at: string
  node: string
}

export interface StoreConversationalChatPayload {
  entity?: string
  q: string
  alpha?: number
  filters?: Record<string, any>
  limit?: number
  locale?: string
  conversation_id?: string
  model_id?: string
}

export interface StoreConversationalChatResponse {
  answer: string
  conversation_id: string
  query: string
  hits: SearchExecutionResult["hits"]
  documents: SearchExecutionResult["documents"]
  search_time_ms: number
}

export interface StoreAnalyticsEventPayload {
  entity: string
  query: string
  clicked_document_id?: string
  click_position?: number
  converted?: boolean
}

export interface StoreAnalyticsEventResponse {
  recorded: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plugin Hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface TypesenseQueryHookOptions<TData = unknown> {
  client?: TypesenseApiClient
  queryKey?: readonly unknown[]
  enabled?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export interface TypesenseMutationHookOptions<
  TData = unknown,
  TVariables = unknown,
> {
  client?: TypesenseApiClient
  queryKey?: readonly unknown[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

export interface UseTypesenseQueryResult<TData> {
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<TData | undefined>
}

export interface UseTypesenseMutationResult<TData, TVariables> {
  mutate: (
    variables: TVariables,
    callOptions?: {
      onSuccess?: (data: TData, variables: TVariables) => void
      onError?: (error: Error, variables: TVariables) => void
    }
  ) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  error: Error | null
  data: TData | undefined
  reset: () => void
}

export interface UseProductTypesenseWidgetStateProps {
  productId?: string
  entity?: string
  client?: TypesenseApiClient
  t?: (key: string, options?: Record<string, any>) => string
}
