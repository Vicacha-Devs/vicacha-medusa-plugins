import { MedusaError } from "../utils/medusa-error.js"
import type {
  CatalogFeedProductItem,
  CatalogSyncBatchResult,
  ProviderFetchedPost,
  ProviderOAuthTokenResult,
  SocialPlatformProvider,
} from "../types/index.js"

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
const TIKTOK_USER_URL = "https://open.tiktokapis.com/v2/user/info/"
const TIKTOK_VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/"
const TIKTOK_CATALOG_URL = "https://open.tiktokapis.com/v2/shop/catalog/batch/"

export interface TikTokProviderOptions {
  clientKey?: string
  clientSecret?: string
  redirectUri?: string
  shopId?: string
  scopes?: string[]
  fetchImpl?: typeof fetch
}

/**
 * TikTok v2 + TikTok Shop Provider Adapter.
 * Supports PKCE S256 OAuth 2.0, Video Feed Sync, Ephemeral TikTok Stories, and TikTok Shop Catalog Batch Push.
 */
export class TikTokProvider implements SocialPlatformProvider {
  readonly platform = "tiktok" as const
  private readonly clientKey: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly shopId: string | null
  private readonly defaultScopes: string[]
  private readonly fetchFn: typeof fetch

  constructor(options: TikTokProviderOptions = {}) {
    this.clientKey = options.clientKey || process.env.TIKTOK_CLIENT_KEY || ""
    this.clientSecret =
      options.clientSecret || process.env.TIKTOK_CLIENT_SECRET || ""
    this.redirectUri =
      options.redirectUri || process.env.TIKTOK_REDIRECT_URI || ""
    this.shopId = options.shopId || process.env.TIKTOK_SHOP_ID || null
    this.defaultScopes = options.scopes ?? [
      "user.info.basic",
      "user.info.profile",
      "user.info.stats",
      "video.list",
    ]
    this.fetchFn = options.fetchImpl ?? globalThis.fetch
  }

  getAuthUrl(options: {
    state: string
    codeChallenge?: string
    redirectUri?: string
    scopes?: string[]
  }): string {
    const url = new URL(TIKTOK_AUTH_URL)
    url.searchParams.set("client_key", this.clientKey || "tiktok_client_key")
    url.searchParams.set("response_type", "code")
    url.searchParams.set(
      "scope",
      (options.scopes ?? this.defaultScopes).join(",")
    )
    url.searchParams.set(
      "redirect_uri",
      options.redirectUri ||
        this.redirectUri ||
        "http://localhost:9000/social/oauth/callback"
    )
    url.searchParams.set("state", options.state)
    if (options.codeChallenge) {
      url.searchParams.set("code_challenge", options.codeChallenge)
      url.searchParams.set("code_challenge_method", "S256")
    }
    return url.toString()
  }

  async exchangeCodeForToken(options: {
    code: string
    codeVerifier?: string
    redirectUri?: string
  }): Promise<ProviderOAuthTokenResult> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      code: options.code,
      grant_type: "authorization_code",
      redirect_uri: options.redirectUri || this.redirectUri,
    })
    if (options.codeVerifier) {
      body.set("code_verifier", options.codeVerifier)
    }

    const tokenRes = await this.fetchFn(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    if (!tokenRes.ok) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `TikTok OAuth token exchange failed with status ${tokenRes.status}.`
      )
    }

    const rawJson = (await tokenRes.json()) as {
      data?: Record<string, unknown>
      access_token?: string
      refresh_token?: string
      open_id?: string
      scope?: string
      expires_in?: number
    }
    const tokenData = (rawJson.data ?? rawJson) as Record<string, unknown>
    const accessToken = String(tokenData.access_token || "")
    if (!accessToken) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "TikTok OAuth response did not contain an access_token."
      )
    }

    const openId = String(tokenData.open_id || "tiktok_user")
    const profile = await this.fetchUserProfile(accessToken, openId)

    return {
      access_token: accessToken,
      refresh_token: tokenData.refresh_token
        ? String(tokenData.refresh_token)
        : null,
      expires_in:
        typeof tokenData.expires_in === "number" ? tokenData.expires_in : 86400,
      scopes: String(tokenData.scope || "user.info.basic,video.list")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      platform_user_id: profile.openId,
      platform_username: profile.username,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      external_shop_id: this.shopId,
      metadata: {
        follower_count: profile.followerCount,
      },
    }
  }

  private async fetchUserProfile(
    accessToken: string,
    fallbackOpenId: string
  ): Promise<{
    openId: string
    username: string
    displayName: string
    avatarUrl: string | null
    followerCount: number
  }> {
    try {
      const url = new URL(TIKTOK_USER_URL)
      url.searchParams.set(
        "fields",
        "open_id,display_name,avatar_url,follower_count,username"
      )
      const res = await this.fetchFn(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      if (!res.ok) {
        return {
          openId: fallbackOpenId,
          username: fallbackOpenId,
          displayName: fallbackOpenId,
          avatarUrl: null,
          followerCount: 0,
        }
      }
      const json = (await res.json()) as {
        data?: {
          user?: {
            open_id?: string
            username?: string
            display_name?: string
            avatar_url?: string
            follower_count?: number
          }
        }
      }
      const user = json.data?.user ?? {}
      return {
        openId: user.open_id || fallbackOpenId,
        username: user.username || user.display_name || fallbackOpenId,
        displayName: user.display_name || user.username || fallbackOpenId,
        avatarUrl: user.avatar_url ?? null,
        followerCount:
          typeof user.follower_count === "number" ? user.follower_count : 0,
      }
    } catch {
      return {
        openId: fallbackOpenId,
        username: fallbackOpenId,
        displayName: fallbackOpenId,
        avatarUrl: null,
        followerCount: 0,
      }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string | null
    expires_in: number | null
  }> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    })

    const res = await this.fetchFn(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `TikTok token refresh failed with status ${res.status}.`
      )
    }

    const rawJson = (await res.json()) as {
      data?: Record<string, unknown>
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }
    const data = (rawJson.data ?? rawJson) as Record<string, unknown>
    return {
      access_token: String(data.access_token || ""),
      refresh_token: data.refresh_token ? String(data.refresh_token) : null,
      expires_in: typeof data.expires_in === "number" ? data.expires_in : 86400,
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
    const url = new URL(TIKTOK_VIDEO_LIST_URL)
    url.searchParams.set(
      "fields",
      "id,title,video_description,cover_image_url,share_url,embed_link,duration,create_time,view_count,like_count,comment_count,share_count"
    )

    const res = await this.fetchFn(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_count: options?.limit ?? 20,
        cursor: options?.cursor ? Number(options.cursor) : 0,
      }),
    })

    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `TikTok video list request failed with status ${res.status}.`
      )
    }

    const json = (await res.json()) as {
      data?: {
        videos?: Array<Record<string, unknown>>
        cursor?: number
        has_more?: boolean
      }
    }

    const videos = json.data?.videos ?? []
    const posts: ProviderFetchedPost[] = videos.map((v) => ({
      platform_post_id: String(v.id || ""),
      media_type: "video",
      caption: String(v.video_description || v.title || ""),
      media_url: String(v.embed_link || v.share_url || ""),
      thumbnail_url: v.cover_image_url ? String(v.cover_image_url) : null,
      permalink: v.share_url ? String(v.share_url) : null,
      duration: typeof v.duration === "number" ? v.duration : null,
      view_count: typeof v.view_count === "number" ? v.view_count : 0,
      like_count: typeof v.like_count === "number" ? v.like_count : 0,
      comment_count: typeof v.comment_count === "number" ? v.comment_count : 0,
      share_count: typeof v.share_count === "number" ? v.share_count : 0,
      published_at:
        typeof v.create_time === "number"
          ? new Date(v.create_time * 1000)
          : new Date(),
      expires_at: null,
      metadata: {
        title: v.title ?? null,
        embed_link: v.embed_link ?? null,
      },
    }))

    return {
      posts,
      nextCursor:
        json.data?.has_more && json.data?.cursor !== undefined
          ? String(json.data.cursor)
          : null,
    }
  }

  async syncCatalogBatch(
    accessToken: string,
    options: {
      externalCatalogId: string
      items: CatalogFeedProductItem[]
    }
  ): Promise<CatalogSyncBatchResult> {
    const res = await this.fetchFn(TIKTOK_CATALOG_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shop_id: options.externalCatalogId,
        items: options.items,
      }),
    })

    if (!res.ok) {
      return {
        platform: "tiktok",
        external_catalog_id: options.externalCatalogId,
        synced_count: 0,
        failed_count: options.items.length,
        errors: options.items.map((i) => ({
          variant_id: i.id,
          message: `TikTok Shop catalog upload failed with HTTP ${res.status}`,
        })),
      }
    }

    return {
      platform: "tiktok",
      external_catalog_id: options.externalCatalogId,
      synced_count: options.items.length,
      failed_count: 0,
      errors: [],
    }
  }
}
