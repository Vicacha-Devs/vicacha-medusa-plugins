import { MedusaError } from "../utils/medusa-error.js"
import type {
  CatalogFeedProductItem,
  CatalogSyncBatchResult,
  MediaType,
  ProviderFetchedPost,
  ProviderOAuthTokenResult,
  SocialPlatformProvider,
} from "../types/index.js"

const META_OAUTH_DIALOG_BASE = "https://www.facebook.com"
const META_GRAPH_API_BASE = "https://graph.facebook.com"

export interface MetaGraphProviderConfig {
  appId?: string
  appSecret?: string
  redirectUri?: string
  graphApiVersion?: string
  catalogId?: string
  scopes?: string[]
  fetchImpl?: typeof fetch
}

/**
 * Unified Meta Graph API Provider supporting both `instagram` (Instagram Professional,
 * Reels, 24h Stories, Instagram Shopping) and `facebook` (Facebook Page, Reels,
 * Live Video, Meta Commerce Catalog `items_batch`).
 */
export class MetaGraphProvider implements SocialPlatformProvider {
  readonly platform: "instagram" | "facebook"
  private readonly appId: string
  private readonly appSecret: string
  private readonly redirectUri: string
  private readonly graphVersion: string
  private readonly catalogId: string | null
  private readonly defaultScopes: string[]
  private readonly fetchFn: typeof fetch

  constructor(
    platformOrOptions:
      | "instagram"
      | "facebook"
      | ({ platform?: "instagram" | "facebook" } & MetaGraphProviderConfig),
    maybeConfig?: MetaGraphProviderConfig
  ) {
    const isStringPlatform = typeof platformOrOptions === "string"
    const config = isStringPlatform ? (maybeConfig ?? {}) : platformOrOptions
    this.platform = isStringPlatform
      ? platformOrOptions
      : (platformOrOptions.platform ?? "instagram")
    this.appId = config.appId || process.env.META_APP_ID || ""
    this.appSecret = config.appSecret || process.env.META_APP_SECRET || ""
    this.redirectUri = config.redirectUri || process.env.META_REDIRECT_URI || ""
    this.graphVersion = config.graphApiVersion || "v20.0"
    this.catalogId = config.catalogId || process.env.META_CATALOG_ID || null
    this.defaultScopes = config.scopes ?? [
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
      "catalog_management",
      "business_management",
    ]
    this.fetchFn = config.fetchImpl ?? globalThis.fetch
  }

  getAuthUrl(options: {
    state: string
    codeChallenge?: string
    redirectUri?: string
    scopes?: string[]
  }): string {
    const url = new URL(
      `${META_OAUTH_DIALOG_BASE}/${this.graphVersion}/dialog/oauth`
    )
    url.searchParams.set("client_id", this.appId || "meta_app_id")
    url.searchParams.set(
      "redirect_uri",
      options.redirectUri ||
        this.redirectUri ||
        "http://localhost:9000/social/oauth/callback"
    )
    url.searchParams.set("state", options.state)
    url.searchParams.set("response_type", "code")
    url.searchParams.set(
      "scope",
      (options.scopes ?? this.defaultScopes).join(",")
    )
    return url.toString()
  }

  async exchangeCodeForToken(options: {
    code: string
    codeVerifier?: string
    redirectUri?: string
  }): Promise<ProviderOAuthTokenResult> {
    const tokenUrl = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/oauth/access_token`
    )
    tokenUrl.searchParams.set("client_id", this.appId)
    tokenUrl.searchParams.set("client_secret", this.appSecret)
    tokenUrl.searchParams.set(
      "redirect_uri",
      options.redirectUri || this.redirectUri
    )
    tokenUrl.searchParams.set("code", options.code)

    const tokenRes = await this.fetchFn(tokenUrl.toString(), { method: "GET" })
    if (!tokenRes.ok) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `Meta OAuth token exchange failed with status ${tokenRes.status}.`
      )
    }

    const shortTokenData = (await tokenRes.json()) as {
      access_token?: string
      expires_in?: number
    }
    const shortToken = shortTokenData.access_token || ""
    if (!shortToken) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Meta OAuth response did not include an access_token."
      )
    }

    // Exchange for 60-day long-lived token
    const longTokenUrl = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/oauth/access_token`
    )
    longTokenUrl.searchParams.set("grant_type", "fb_exchange_token")
    longTokenUrl.searchParams.set("client_id", this.appId)
    longTokenUrl.searchParams.set("client_secret", this.appSecret)
    longTokenUrl.searchParams.set("fb_exchange_token", shortToken)

    let finalToken = shortToken
    let expiresIn = shortTokenData.expires_in ?? 5184000
    const longRes = await this.fetchFn(longTokenUrl.toString(), {
      method: "GET",
    })
    if (longRes.ok) {
      const longJson = (await longRes.json()) as {
        access_token?: string
        expires_in?: number
      }
      if (longJson.access_token) {
        finalToken = longJson.access_token
      }
      if (typeof longJson.expires_in === "number") {
        expiresIn = longJson.expires_in
      }
    }

    // Discover connected Facebook Page & Instagram Business Account
    const accountsUrl = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/me/accounts`
    )
    accountsUrl.searchParams.set(
      "fields",
      "id,name,access_token,fan_count,picture{url},instagram_business_account{id,username,profile_picture_url,followers_count}"
    )
    accountsUrl.searchParams.set("access_token", finalToken)

    const pagesRes = await this.fetchFn(accountsUrl.toString(), {
      method: "GET",
    })
    if (pagesRes.ok) {
      const pagesJson = (await pagesRes.json()) as {
        data?: Array<{
          id?: string
          name?: string
          access_token?: string
          fan_count?: number
          picture?: { data?: { url?: string } }
          instagram_business_account?: {
            id?: string
            username?: string
            profile_picture_url?: string
            followers_count?: number
          }
        }>
      }
      const firstPage = pagesJson.data?.[0]
      if (
        this.platform === "instagram" &&
        firstPage?.instagram_business_account
      ) {
        const ig = firstPage.instagram_business_account
        return {
          access_token: finalToken,
          refresh_token: finalToken,
          expires_in: expiresIn,
          scopes: this.defaultScopes,
          platform_user_id: ig.id || "ig_business_id",
          platform_username: ig.username || firstPage.name || "instagram_shop",
          display_name: ig.username || firstPage.name || "Instagram Shop",
          avatar_url: ig.profile_picture_url ?? null,
          external_catalog_id: this.catalogId,
          metadata: {
            follower_count: ig.followers_count ?? 0,
            facebook_page_id: firstPage.id ?? null,
          },
        }
      }

      if (firstPage) {
        return {
          access_token: firstPage.access_token || finalToken,
          refresh_token: finalToken,
          expires_in: expiresIn,
          scopes: this.defaultScopes,
          platform_user_id: firstPage.id || "fb_page_id",
          platform_username: firstPage.name || "facebook_page",
          display_name: firstPage.name || "Facebook Page",
          avatar_url: firstPage.picture?.data?.url ?? null,
          external_catalog_id: this.catalogId,
          metadata: {
            follower_count: firstPage.fan_count ?? 0,
          },
        }
      }
    }

    return {
      access_token: finalToken,
      refresh_token: finalToken,
      expires_in: expiresIn,
      scopes: this.defaultScopes,
      platform_user_id: `${this.platform}_user`,
      platform_username: `${this.platform}_merchant`,
      display_name: `${this.platform} Merchant`,
      avatar_url: null,
      external_catalog_id: this.catalogId,
      metadata: {},
    }
  }

  async refreshAccessToken(longLivedToken: string): Promise<{
    access_token: string
    refresh_token: string | null
    expires_in: number | null
  }> {
    const url = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/oauth/access_token`
    )
    url.searchParams.set("grant_type", "fb_exchange_token")
    url.searchParams.set("client_id", this.appId)
    url.searchParams.set("client_secret", this.appSecret)
    url.searchParams.set("fb_exchange_token", longLivedToken)

    const res = await this.fetchFn(url.toString(), { method: "GET" })
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `Meta token refresh failed with status ${res.status}.`
      )
    }

    const json = (await res.json()) as {
      access_token?: string
      expires_in?: number
    }
    const token = json.access_token || longLivedToken
    return {
      access_token: token,
      refresh_token: token,
      expires_in: typeof json.expires_in === "number" ? json.expires_in : 5184000,
    }
  }

  async fetchMediaPosts(
    accessToken: string,
    options?: {
      limit?: number
      cursor?: string
      platformUserId?: string
    }
  ): Promise<{
    posts: ProviderFetchedPost[]
    nextCursor: string | null
  }> {
    const userId = options?.platformUserId || "me"
    const url = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/${userId}/media`
    )
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count"
    )
    url.searchParams.set("limit", String(options?.limit ?? 25))
    url.searchParams.set("access_token", accessToken)

    const res = await this.fetchFn(url.toString(), { method: "GET" })
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Meta media fetch failed with status ${res.status}.`
      )
    }

    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>
      paging?: { cursors?: { after?: string } }
    }

    const items = json.data ?? []
    const posts: ProviderFetchedPost[] = items.map((item) => {
      const rawType = String(
        item.media_product_type || item.media_type || "IMAGE"
      ).toUpperCase()
      let mediaType: MediaType = "image"
      if (rawType === "REELS") mediaType = "reel"
      else if (rawType === "VIDEO") mediaType = "video"
      else if (rawType === "CAROUSEL_ALBUM") mediaType = "carousel"
      else if (rawType === "STORY") mediaType = "story"

      const publishedAt = item.timestamp
        ? new Date(String(item.timestamp))
        : new Date()

      return {
        platform_post_id: String(item.id || ""),
        media_type: mediaType,
        caption: item.caption ? String(item.caption) : null,
        media_url: String(item.media_url || item.permalink || ""),
        thumbnail_url: item.thumbnail_url ? String(item.thumbnail_url) : null,
        permalink: item.permalink ? String(item.permalink) : null,
        duration: null,
        view_count: 0,
        like_count: typeof item.like_count === "number" ? item.like_count : 0,
        comment_count:
          typeof item.comments_count === "number" ? item.comments_count : 0,
        share_count: 0,
        published_at: publishedAt,
        expires_at:
          mediaType === "story"
            ? new Date(publishedAt.getTime() + 24 * 3600 * 1000)
            : null,
        metadata: {},
      }
    })

    return {
      posts,
      nextCursor: json.paging?.cursors?.after ?? null,
    }
  }

  async fetchStories(
    accessToken: string,
    options?: {
      platformUserId?: string
    }
  ): Promise<ProviderFetchedPost[]> {
    const userId = options?.platformUserId || "me"
    const url = new URL(
      `${META_GRAPH_API_BASE}/${this.graphVersion}/${userId}/stories`
    )
    url.searchParams.set(
      "fields",
      "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp"
    )
    url.searchParams.set("access_token", accessToken)

    const res = await this.fetchFn(url.toString(), { method: "GET" })
    if (!res.ok) {
      return []
    }

    const json = (await res.json()) as {
      data?: Array<Record<string, unknown>>
    }
    const items = json.data ?? []

    return items.map((item) => {
      const publishedAt = item.timestamp
        ? new Date(String(item.timestamp))
        : new Date()
      return {
        platform_post_id: String(item.id || ""),
        media_type: "story",
        caption: item.caption ? String(item.caption) : null,
        media_url: String(item.media_url || item.permalink || ""),
        thumbnail_url: item.thumbnail_url ? String(item.thumbnail_url) : null,
        permalink: item.permalink ? String(item.permalink) : null,
        duration: 15,
        view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        published_at: publishedAt,
        expires_at: new Date(publishedAt.getTime() + 24 * 3600 * 1000),
        metadata: {},
      }
    })
  }

  async syncCatalogBatch(
    accessToken: string,
    options: {
      externalCatalogId: string
      items: CatalogFeedProductItem[]
    }
  ): Promise<CatalogSyncBatchResult> {
    const url = `${META_GRAPH_API_BASE}/${this.graphVersion}/${encodeURIComponent(
      options.externalCatalogId
    )}/items_batch`

    const requests = options.items.map((item) => ({
      method: "UPDATE",
      retailer_id: item.id,
      data: {
        id: item.id,
        item_group_id: item.item_group_id,
        title: item.title,
        description: item.description,
        availability: item.availability ?? "in stock",
        condition: item.condition ?? "new",
        price: `${Number(item.price).toFixed(2)} ${item.currency_code}`,
        link: item.link,
        image_link: item.image_link,
        brand: item.brand ?? "Medusa Store",
      },
    }))

    const res = await this.fetchFn(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_type: "PRODUCT_ITEM",
        requests,
      }),
    })

    if (!res.ok) {
      return {
        platform: this.platform,
        external_catalog_id: options.externalCatalogId,
        synced_count: 0,
        failed_count: options.items.length,
        errors: options.items.map((i) => ({
          variant_id: i.id,
          message: `Meta Catalog items_batch failed with HTTP ${res.status}`,
        })),
      }
    }

    return {
      platform: this.platform,
      external_catalog_id: options.externalCatalogId,
      synced_count: options.items.length,
      failed_count: 0,
      errors: [],
    }
  }
}
