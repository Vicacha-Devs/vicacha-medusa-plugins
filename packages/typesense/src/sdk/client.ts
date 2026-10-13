import type {
  AnalyticsSummary,
  DeleteCustomEntityResponse,
  DeleteSingleDocumentResponse,
  DocumentInspectResult,
  EntityConfigPayload,
  FederatedSearchResult,
  PlaygroundSearchPayload,
  SearchExecutionResult,
  StoreAnalyticsEventPayload,
  StoreAnalyticsEventResponse,
  StoreConversationalChatPayload,
  StoreConversationalChatResponse,
  StoreFederatedSearchPayload,
  StoreScopedTokenParams,
  StoreScopedTokenResponse,
  StoreSearchQueryParams,
  SyncAllCollectionsResponse,
  SyncCollectionsPayload,
  SyncEntityCollectionResponse,
  SyncSingleDocumentResponse,
  TypesenseApiClientOptions,
  TypesenseCollectionsResponse,
  TypesenseCurationsResponse,
  TypesenseEntitiesResponse,
  TypesenseHealthResponse,
  TypesenseStopwordsResponse,
  TypesenseSynonymsResponse,
  UpsertCurationPayload,
  UpsertEntityConfigResponse,
  UpsertStopwordsPayload,
  UpsertSynonymPayload,
} from "../types"

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return ""
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue
    if (Array.isArray(value)) {
      search.set(key, value.join(","))
    } else if (typeof value === "object") {
      search.set(key, JSON.stringify(value))
    } else {
      search.set(key, String(value))
    }
  }
  const str = search.toString()
  return str ? `?${str}` : ""
}

/**
 * Typed SDK client for `medusa-plugin-typesense`.
 * Supports both `/admin` and `/store` routes with automatic JSON parsing
 * and standard Medusa error extraction.
 */
export class TypesenseApiClient {
  private readonly baseUrl: string
  private readonly prefix: string
  private readonly options: TypesenseApiClientOptions

  constructor(
    prefix: "/admin" | "/store" = "/store",
    baseUrl: string = "",
    options: TypesenseApiClientOptions = {}
  ) {
    this.prefix = prefix
    this.baseUrl = baseUrl.replace(/\/$/, "")
    this.options = options
  }

  public resolveUrl(
    endpoint: string,
    params?: Record<string, unknown>
  ): string {
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint
      : `/${endpoint}`
    return `${this.baseUrl}${this.prefix}${normalizedEndpoint}${buildQueryString(params)}`
  }

  private buildHeaders(
    customHeaders?: HeadersInit,
    hasJsonBody = true
  ): Record<string, string> {
    const headers: Record<string, string> = {
      ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
      ...(this.options.headers || {}),
    }

    if (this.options.publishableApiKey) {
      headers["x-publishable-api-key"] = this.options.publishableApiKey
    }

    if (customHeaders) {
      if (customHeaders instanceof Headers) {
        customHeaders.forEach((v, k) => {
          headers[k] = v
        })
      } else if (Array.isArray(customHeaders)) {
        for (const [k, v] of customHeaders) {
          headers[k] = v
        }
      } else {
        Object.assign(headers, customHeaders)
      }
    }

    return headers
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit,
    queryParams?: Record<string, unknown>
  ): Promise<T> {
    const url = this.resolveUrl(endpoint, queryParams)
    const fetchFn = this.options.fetchImpl ?? globalThis.fetch
    const hasJsonBody =
      options?.body !== undefined && !(options.body instanceof FormData)

    const response = await fetchFn(url, {
      credentials: this.options.credentials ?? "include",
      ...options,
      headers: this.buildHeaders(options?.headers, hasJsonBody),
    })

    if (response.status === 204) {
      return {} as T
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        (data as { message?: string; detail?: string }).message ||
          (data as { detail?: string }).detail ||
          `Request failed with status ${response.status}`
      )
    }

    return data as T
  }

  // ---------------------------------------------------------------------------
  // Admin Endpoints (/admin/typesense/*)
  // ---------------------------------------------------------------------------

  async getHealth(): Promise<TypesenseHealthResponse> {
    return this.fetch<TypesenseHealthResponse>("/typesense/health", {
      method: "GET",
    })
  }

  async listCollections(): Promise<TypesenseCollectionsResponse> {
    return this.fetch<TypesenseCollectionsResponse>("/typesense/collections", {
      method: "GET",
    })
  }

  async syncAllCollections(
    payload: SyncCollectionsPayload = { recreate: true, zero_downtime: true }
  ): Promise<SyncAllCollectionsResponse> {
    return this.fetch<SyncAllCollectionsResponse>("/typesense/collections", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async syncEntityCollection(
    entity: string,
    payload: SyncCollectionsPayload = { recreate: true, zero_downtime: true }
  ): Promise<SyncEntityCollectionResponse> {
    return this.fetch<SyncEntityCollectionResponse>(
      `/typesense/collections/${encodeURIComponent(entity)}/sync`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async listEntities(): Promise<TypesenseEntitiesResponse> {
    return this.fetch<TypesenseEntitiesResponse>("/typesense/entities", {
      method: "GET",
    })
  }

  async upsertEntityConfig(
    payload: Partial<EntityConfigPayload> & { entity_type: string }
  ): Promise<UpsertEntityConfigResponse> {
    return this.fetch<UpsertEntityConfigResponse>("/typesense/entities", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async deleteCustomEntity(entity: string): Promise<DeleteCustomEntityResponse> {
    return this.fetch<DeleteCustomEntityResponse>(
      `/typesense/entities/${encodeURIComponent(entity)}`,
      { method: "DELETE" }
    )
  }

  async listSynonyms(entity: string): Promise<TypesenseSynonymsResponse> {
    return this.fetch<TypesenseSynonymsResponse>(
      `/typesense/synonyms/${encodeURIComponent(entity)}`,
      { method: "GET" }
    )
  }

  async upsertSynonym(
    entity: string,
    payload: UpsertSynonymPayload
  ): Promise<Record<string, any>> {
    return this.fetch<Record<string, any>>(
      `/typesense/synonyms/${encodeURIComponent(entity)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async deleteSynonym(
    entity: string,
    id: string
  ): Promise<{ deleted?: boolean }> {
    return this.fetch<{ deleted?: boolean }>(
      `/typesense/synonyms/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async listCurations(entity: string): Promise<TypesenseCurationsResponse> {
    return this.fetch<TypesenseCurationsResponse>(
      `/typesense/curations/${encodeURIComponent(entity)}`,
      { method: "GET" }
    )
  }

  async upsertCuration(
    entity: string,
    payload: UpsertCurationPayload
  ): Promise<Record<string, any>> {
    return this.fetch<Record<string, any>>(
      `/typesense/curations/${encodeURIComponent(entity)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    )
  }

  async deleteCuration(
    entity: string,
    id: string
  ): Promise<{ deleted?: boolean }> {
    return this.fetch<{ deleted?: boolean }>(
      `/typesense/curations/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async listStopwords(): Promise<TypesenseStopwordsResponse> {
    return this.fetch<TypesenseStopwordsResponse>("/typesense/stopwords", {
      method: "GET",
    })
  }

  async upsertStopwords(
    payload: UpsertStopwordsPayload
  ): Promise<Record<string, any>> {
    return this.fetch<Record<string, any>>("/typesense/stopwords", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async deleteStopwords(id: string): Promise<{ deleted?: boolean }> {
    return this.fetch<{ deleted?: boolean }>(
      `/typesense/stopwords/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  async runPlaygroundSearch(
    payload: PlaygroundSearchPayload
  ): Promise<SearchExecutionResult> {
    return this.fetch<SearchExecutionResult>("/typesense/playground", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async getAnalytics(): Promise<AnalyticsSummary> {
    return this.fetch<AnalyticsSummary>("/typesense/analytics", {
      method: "GET",
    })
  }

  async inspectDocument(
    entity: string,
    id: string
  ): Promise<DocumentInspectResult> {
    return this.fetch<DocumentInspectResult>(
      `/typesense/documents/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: "GET" }
    )
  }

  async syncDocument(
    entity: string,
    id: string
  ): Promise<SyncSingleDocumentResponse> {
    return this.fetch<SyncSingleDocumentResponse>(
      `/typesense/documents/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: "POST" }
    )
  }

  async deleteDocument(
    entity: string,
    id: string
  ): Promise<DeleteSingleDocumentResponse> {
    return this.fetch<DeleteSingleDocumentResponse>(
      `/typesense/documents/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    )
  }

  // ---------------------------------------------------------------------------
  // Storefront Endpoints (/store/typesense/*)
  // ---------------------------------------------------------------------------

  async search<T = Record<string, any>>(
    params: StoreSearchQueryParams
  ): Promise<SearchExecutionResult<T>> {
    const hasComplexFields =
      params.filters !== undefined ||
      params.range_facets !== undefined ||
      params.vector !== undefined

    if (hasComplexFields) {
      return this.fetch<SearchExecutionResult<T>>("/typesense/search", {
        method: "POST",
        body: JSON.stringify(params),
      })
    }

    return this.fetch<SearchExecutionResult<T>>(
      "/typesense/search",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async federatedSearch(
    payload: StoreFederatedSearchPayload
  ): Promise<FederatedSearchResult> {
    return this.fetch<FederatedSearchResult>("/typesense/search", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async searchProducts<T = Record<string, any>>(
    params?: Omit<StoreSearchQueryParams, "entity">
  ): Promise<SearchExecutionResult<T>> {
    return this.fetch<SearchExecutionResult<T>>(
      "/typesense/products",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async searchCategories<T = Record<string, any>>(
    params?: Omit<StoreSearchQueryParams, "entity">
  ): Promise<SearchExecutionResult<T>> {
    return this.fetch<SearchExecutionResult<T>>(
      "/typesense/categories",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async searchCollections<T = Record<string, any>>(
    params?: Omit<StoreSearchQueryParams, "entity">
  ): Promise<SearchExecutionResult<T>> {
    return this.fetch<SearchExecutionResult<T>>(
      "/typesense/collections",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async getScopedSearchToken(
    params?: StoreScopedTokenParams
  ): Promise<StoreScopedTokenResponse> {
    return this.fetch<StoreScopedTokenResponse>(
      "/typesense/token",
      { method: "GET" },
      params as Record<string, unknown>
    )
  }

  async conversationalChat(
    payload: StoreConversationalChatPayload
  ): Promise<StoreConversationalChatResponse> {
    return this.fetch<StoreConversationalChatResponse>("/typesense/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async trackAnalyticsEvent(
    payload: StoreAnalyticsEventPayload
  ): Promise<StoreAnalyticsEventResponse> {
    return this.fetch<StoreAnalyticsEventResponse>("/typesense/analytics", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }
}

export const typesenseAdminSdk = new TypesenseApiClient("/admin")
export const typesenseStoreSdk = new TypesenseApiClient("/store")
