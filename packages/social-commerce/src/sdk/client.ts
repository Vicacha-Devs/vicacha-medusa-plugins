import { MedusaError } from "../modules/social-commerce/utils/medusa-error.js"
import type {
  AttachLiveProductInput,
  CatalogFeedFormat,
  CatalogFeedProductItem,
  CatalogSyncBatchResult,
  CatalogSyncItemRecord,
  CheckoutHandoffInput,
  CheckoutHandoffResult,
  CreateLiveSessionInput,
  CreateLocalStoryInput,
  LiveProductRecord,
  LiveSessionRecord,
  LiveSessionStatus,
  MediaType,
  PostStatus,
  ReservationRecord,
  ReserveLiveStockInput,
  SocialAccountPublicDTO,
  SocialAccountStatus,
  SocialMediaPostRecord,
  SocialPlatform,
  SocialProductTagRecord,
  TagProductInput,
} from "../modules/social-commerce/types/index.js"

export interface SocialCommerceSDKConfig {
  baseUrl: string
  publishableApiKey?: string
  adminApiToken?: string
  customHeaders?: Record<string, string>
  fetchImpl?: typeof fetch
}

/**
 * Isomorphic TypeScript SDK client for `medusa-plugin-social-commerce`.
 * Provides typed Storefront and Admin API methods for TikTok, Instagram, Facebook,
 * and Local Ephemeral Stories.
 */
export class SocialCommerceSDKClient {
  private readonly baseUrl: string
  private readonly publishableApiKey?: string
  private readonly adminApiToken?: string
  private readonly customHeaders: Record<string, string>
  private readonly fetchFn: typeof fetch

  constructor(config: SocialCommerceSDKConfig) {
    if (!config.baseUrl?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_ARGUMENT,
        "baseUrl is required to initialize SocialCommerceSDKClient."
      )
    }
    this.baseUrl = config.baseUrl.replace(/\/+$/, "")
    this.publishableApiKey = config.publishableApiKey
    this.adminApiToken = config.adminApiToken
    this.customHeaders = config.customHeaders ?? {}
    this.fetchFn = config.fetchImpl ?? globalThis.fetch
  }

  private async request<T>(
    path: string,
    options?: {
      method?: "GET" | "POST" | "PATCH" | "DELETE"
      query?: Record<string, string | number | boolean | undefined>
      body?: unknown
      isAdmin?: boolean
    }
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      }
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.customHeaders,
    }

    if (options?.body !== undefined) {
      headers["Content-Type"] = "application/json"
    }
    if (this.publishableApiKey && !options?.isAdmin) {
      headers["x-publishable-api-key"] = this.publishableApiKey
    }
    if (this.adminApiToken && options?.isAdmin) {
      headers.Authorization = `Bearer ${this.adminApiToken}`
    }

    const response = await this.fetchFn(url.toString(), {
      method: options?.method ?? "GET",
      headers,
      credentials: "include",
      body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      let message = `Social Commerce API error (${response.status})`
      try {
        const errorJson = (await response.json()) as { message?: string }
        if (errorJson?.message) {
          message = errorJson.message
        }
      } catch {
        // Ignore JSON parse fallback
      }
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, message)
    }

    return (await response.json()) as T
  }

  // ===========================================================================
  // Storefront Methods
  // ===========================================================================

  async getStoreFeed(params?: {
    platform?: SocialPlatform
    media_type?: MediaType
    shoppable_only?: boolean
    featured_only?: boolean
    limit?: number
    offset?: number
  }): Promise<{
    feed: Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
    count: number
    limit: number
    offset: number
  }> {
    return this.request("/store/social/feed", {
      query: params,
    })
  }

  async getStoreStories(params?: {
    platform?: SocialPlatform
    featured_only?: boolean
    limit?: number
  }): Promise<{
    stories: Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
    count: number
  }> {
    return this.request("/store/social/stories", {
      query: params,
    })
  }

  async getStorePost(postId: string): Promise<{
    post: SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }
  }> {
    return this.request(`/store/social/posts/${encodeURIComponent(postId)}`)
  }

  async getStoreActiveLiveSessions(params?: {
    platform?: SocialPlatform
  }): Promise<{
    live_sessions: Array<
      LiveSessionRecord & {
        products: Array<
          LiveProductRecord & {
            stock_availability: { total: number; reserved: number; available: number }
          }
        >
      }
    >
    count: number
  }> {
    return this.request("/store/social/live", {
      query: params,
    })
  }

  async reserveLiveStock(
    input: ReserveLiveStockInput
  ): Promise<{ reservation: ReservationRecord }> {
    return this.request("/store/social/live", {
      method: "POST",
      body: input,
    })
  }

  async createCheckoutHandoff(
    input: CheckoutHandoffInput
  ): Promise<{ handoff: CheckoutHandoffResult }> {
    return this.request("/store/social/checkout-handoff", {
      method: "POST",
      body: {
        products: input.products_param,
        items: input.items,
        coupon: input.coupon,
        source_platform: input.source_platform,
        source_post_id: input.source_post_id,
        live_session_id: input.live_session_id,
        reservation_id: input.reservation_id,
      },
    })
  }

  getCatalogFeedUrl(format: CatalogFeedFormat = "xml", currencyCode: string = "USD"): string {
    const url = new URL(`${this.baseUrl}/store/social/catalog-feed`)
    url.searchParams.set("format", format)
    url.searchParams.set("currency_code", currencyCode)
    return url.toString()
  }

  // ===========================================================================
  // Admin Methods
  // ===========================================================================

  async connectAccount(input: {
    platform: "tiktok" | "instagram" | "facebook"
    redirect_uri?: string
    scopes?: string[]
  }): Promise<{ auth_url: string; state: string; platform: SocialPlatform }> {
    return this.request("/admin/social/connect", {
      method: "POST",
      body: input,
      isAdmin: true,
    })
  }

  async listAccounts(params?: {
    platform?: SocialPlatform
    status?: SocialAccountStatus
  }): Promise<{ accounts: SocialAccountPublicDTO[]; count: number }> {
    return this.request("/admin/social/accounts", {
      query: params,
      isAdmin: true,
    })
  }

  async refreshAccountToken(
    accountId: string
  ): Promise<{ account: SocialAccountPublicDTO }> {
    return this.request(`/admin/social/accounts/${encodeURIComponent(accountId)}`, {
      method: "POST",
      isAdmin: true,
    })
  }

  async disconnectAccount(
    accountId: string,
    hardDelete: boolean = false
  ): Promise<{ id: string; status: "disconnected" | "deleted" }> {
    return this.request(`/admin/social/accounts/${encodeURIComponent(accountId)}`, {
      method: "DELETE",
      query: { hard: hardDelete },
      isAdmin: true,
    })
  }

  async syncMedia(input?: {
    account_id?: string
    platform?: SocialPlatform
    include_stories?: boolean
  }): Promise<{
    accounts_synced: number
    total_posts: number
    total_stories: number
    errors: Array<{ account_id: string; error: string }>
  }> {
    return this.request("/admin/social/sync", {
      method: "POST",
      body: input ?? {},
      isAdmin: true,
    })
  }

  async listAdminPosts(params?: {
    platform?: SocialPlatform
    media_type?: MediaType
    status?: PostStatus
    product_id?: string
    include_expired?: boolean
    limit?: number
    offset?: number
  }): Promise<{
    posts: Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
    count: number
  }> {
    return this.request("/admin/social/posts", {
      query: params,
      isAdmin: true,
    })
  }

  async createLocalStory(
    input: CreateLocalStoryInput
  ): Promise<{ post: SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] } }> {
    return this.request("/admin/social/posts", {
      method: "POST",
      body: input,
      isAdmin: true,
    })
  }

  async updateAdminPost(
    postId: string,
    patch: Record<string, unknown>
  ): Promise<{ post: SocialMediaPostRecord }> {
    return this.request(`/admin/social/posts/${encodeURIComponent(postId)}`, {
      method: "PATCH",
      body: patch,
      isAdmin: true,
    })
  }

  async deleteAdminPost(postId: string): Promise<{ id: string; deleted: boolean }> {
    return this.request(`/admin/social/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      isAdmin: true,
    })
  }

  async tagProductsOnPost(
    postId: string,
    tags: TagProductInput[],
    replaceExisting: boolean = true
  ): Promise<{ post_id: string; tagged_products: SocialProductTagRecord[] }> {
    return this.request(
      `/admin/social/posts/${encodeURIComponent(postId)}/products`,
      {
        method: "POST",
        body: { tags, replace_existing: replaceExisting },
        isAdmin: true,
      }
    )
  }

  async listAdminLiveSessions(params?: {
    platform?: SocialPlatform
    status?: LiveSessionStatus
  }): Promise<{
    sessions: Array<
      LiveSessionRecord & {
        products: Array<
          LiveProductRecord & {
            stock_availability: { total: number; reserved: number; available: number }
          }
        >
      }
    >
    count: number
  }> {
    return this.request("/admin/social/live", {
      query: params,
      isAdmin: true,
    })
  }

  async createLiveSession(
    input: CreateLiveSessionInput
  ): Promise<{ session: LiveSessionRecord }> {
    return this.request("/admin/social/live", {
      method: "POST",
      body: input,
      isAdmin: true,
    })
  }

  async controlLiveSession(
    sessionId: string,
    action: "start" | "end",
    options?: { stream_url?: string; platform_live_id?: string }
  ): Promise<{ session: LiveSessionRecord; released_reservations?: number }> {
    return this.request(`/admin/social/live/${encodeURIComponent(sessionId)}`, {
      method: "POST",
      body: {
        action,
        ...options,
      },
      isAdmin: true,
    })
  }

  async attachLiveProducts(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<{ session_id: string; products: LiveProductRecord[] }> {
    return this.request(
      `/admin/social/live/${encodeURIComponent(sessionId)}/products`,
      {
        method: "POST",
        body: { products },
        isAdmin: true,
      }
    )
  }

  async listCatalogSyncItems(params?: {
    social_account_id?: string
    platform?: SocialPlatform
    sync_status?: "pending" | "synced" | "failed"
    product_id?: string
  }): Promise<{ catalog_items: CatalogSyncItemRecord[]; count: number }> {
    return this.request("/admin/social/catalog", {
      query: params,
      isAdmin: true,
    })
  }

  async syncCatalogBatch(input: {
    account_id: string
    external_catalog_id?: string
    items: CatalogFeedProductItem[]
  }): Promise<CatalogSyncBatchResult> {
    return this.request("/admin/social/catalog", {
      method: "POST",
      body: input,
      isAdmin: true,
    })
  }
}

export function createSocialCommerceSDK(
  config: SocialCommerceSDKConfig
): SocialCommerceSDKClient {
  return new SocialCommerceSDKClient(config)
}

