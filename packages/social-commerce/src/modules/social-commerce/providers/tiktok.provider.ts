import { MedusaError } from "../utils/medusa-error.js"
import type {
  CatalogFeedProductItem,
  CatalogSyncBatchResult,
  LiveSessionStatus,
  ProviderFetchedPost,
  ProviderLiveSessionInfo,
  ProviderOAuthTokenResult,
  SocialPlatformProvider,
} from "../types/index"

const TIKTOK_AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/"
const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/"
const TIKTOK_REVOKE_URL = "https://open.tiktokapis.com/v2/oauth/revoke/"
const TIKTOK_USER_URL = "https://open.tiktokapis.com/v2/user/info/"
const TIKTOK_VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/"
const TIKTOK_VIDEO_QUERY_URL = "https://open.tiktokapis.com/v2/video/query/"
const TIKTOK_LIVE_INFO_URL = "https://open.tiktokapis.com/v2/live/info/"
const TIKTOK_CATALOG_URL = "https://open.tiktokapis.com/v2/shop/catalog/batch/"

export interface TikTokProviderOptions {
  clientKey?: string
  clientSecret?: string
  redirectUri?: string
  shopId?: string
  scopes?: string[]
  fetchImpl?: typeof fetch
  maxRetries?: number
  retryDelayMs?: number
}

/**
 * TikTok v2 + TikTok Shop Provider Adapter.
 * Supports PKCE S256 OAuth 2.0, token revocation, exponential backoff retry on 429/5xx,
 * body-level error validation, Video Feed Sync, single video query, Live room info,
 * Ephemeral TikTok Stories, and TikTok Shop Catalog Batch Push.
 */
export class TikTokProvider implements SocialPlatformProvider {
  readonly platform = "tiktok" as const
  private readonly clientKey: string
  private readonly clientSecret: string
  private readonly redirectUri: string
  private readonly shopId: string | null
  private readonly defaultScopes: string[]
  private readonly fetchFn: typeof fetch
  private readonly maxRetries: number
  private readonly baseRetryDelayMs: number

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
    this.maxRetries = options.maxRetries ?? 3
    this.baseRetryDelayMs = options.retryDelayMs ?? 30
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return
    await new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchWithRetry(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    let attempt = 0
    while (true) {
      const res = await this.fetchFn(url, init)
      if (
        (res.status === 429 || res.status >= 500) &&
        attempt < this.maxRetries
      ) {
        const retryAfter = res.headers?.get?.("retry-after")
        let delayMs =
          this.baseRetryDelayMs * Math.pow(2, attempt) +
          Math.floor(Math.random() * 15)
        if (retryAfter) {
          const parsedSec = Number(retryAfter)
          if (Number.isFinite(parsedSec) && parsedSec >= 0) {
            delayMs = Math.min(parsedSec * 1000, 2000)
          }
        }
        attempt += 1
        await this.sleep(delayMs)
        continue
      }
      return res
    }
  }

  private assertNoTikTokBodyError(rawJson: unknown, context: string): void {
    if (!rawJson || typeof rawJson !== "object") return
    const record = rawJson as Record<string, unknown>

    // 1. Flat OAuth error structure: { error: "invalid_grant", error_description: "..." }
    if (
      typeof record.error === "string" &&
      record.error.trim() !== "" &&
      record.error !== "ok"
    ) {
      const msg =
        (typeof record.error_description === "string" &&
          record.error_description) ||
        (typeof record.message === "string" && record.message) ||
        record.error
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `${context}: ${msg}`
      )
    }

    // 2. Nested TikTok v2 API error structure: { error: { code: "access_token_invalid", message: "..." } }
    if (record.error && typeof record.error === "object") {
      const errObj = record.error as {
        code?: string | number
        message?: string
      }
      if (
        errObj.code !== undefined &&
        errObj.code !== null &&
        errObj.code !== "ok" &&
        errObj.code !== 0 &&
        errObj.code !== "0"
      ) {
        const codeStr = String(errObj.code)
        const detail = errObj.message ? `${errObj.message} (${codeStr})` : codeStr
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${context}: ${detail}`
        )
      }
    }
  }

  private mapVideoRecordToFetchedPost(
    v: Record<string, unknown>
  ): ProviderFetchedPost {
    return {
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
    }
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

    const tokenRes = await this.fetchWithRetry(TIKTOK_TOKEN_URL, {
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
      error?: unknown
    }
    this.assertNoTikTokBodyError(rawJson, "TikTok OAuth token exchange")

    const tokenData = (rawJson.data ?? rawJson) as Record<string, unknown>
    this.assertNoTikTokBodyError(tokenData, "TikTok OAuth token exchange")

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
      const res = await this.fetchWithRetry(url.toString(), {
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
        error?: { code?: string | number; message?: string }
      }
      this.assertNoTikTokBodyError(json, "TikTok user profile")
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

    const res = await this.fetchWithRetry(TIKTOK_TOKEN_URL, {
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
      error?: unknown
    }
    this.assertNoTikTokBodyError(rawJson, "TikTok token refresh")

    const data = (rawJson.data ?? rawJson) as Record<string, unknown>
    this.assertNoTikTokBodyError(data, "TikTok token refresh")

    return {
      access_token: String(data.access_token || ""),
      refresh_token: data.refresh_token ? String(data.refresh_token) : null,
      expires_in: typeof data.expires_in === "number" ? data.expires_in : 86400,
    }
  }

  async revokeToken(accessToken: string): Promise<void> {
    const body = new URLSearchParams({
      client_key: this.clientKey,
      client_secret: this.clientSecret,
      token: accessToken,
    })

    const res = await this.fetchWithRetry(TIKTOK_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    })

    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `TikTok token revocation failed with status ${res.status}.`
      )
    }

    const rawJson = await res.json().catch(() => ({}))
    this.assertNoTikTokBodyError(rawJson, "TikTok token revocation")
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

    const parsedCursor =
      options?.cursor !== undefined
        ? Number.isNaN(Number(options.cursor))
          ? options.cursor
          : Number(options.cursor)
        : 0

    const res = await this.fetchWithRetry(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_count: options?.limit ?? 20,
        cursor: parsedCursor,
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
        cursor?: number | string
        has_more?: boolean
      }
      error?: { code?: string | number; message?: string }
    }
    this.assertNoTikTokBodyError(json, "TikTok video list")

    const videos = json.data?.videos ?? []
    const posts: ProviderFetchedPost[] = videos.map((v) =>
      this.mapVideoRecordToFetchedPost(v)
    )

    return {
      posts,
      nextCursor:
        json.data?.has_more && json.data?.cursor !== undefined
          ? String(json.data.cursor)
          : null,
    }
  }

  async getVideo(
    accessToken: string,
    videoId: string
  ): Promise<ProviderFetchedPost | null> {
    const url = new URL(TIKTOK_VIDEO_QUERY_URL)
    url.searchParams.set(
      "fields",
      "id,title,video_description,cover_image_url,share_url,embed_link,duration,create_time,view_count,like_count,comment_count,share_count"
    )

    const res = await this.fetchWithRetry(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: {
          video_ids: [videoId],
        },
      }),
    })

    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `TikTok video query request failed with status ${res.status}.`
      )
    }

    const json = (await res.json()) as {
      data?: {
        videos?: Array<Record<string, unknown>>
      }
      error?: { code?: string | number; message?: string }
    }
    this.assertNoTikTokBodyError(json, "TikTok video query")

    const video = json.data?.videos?.[0]
    if (!video || !video.id) {
      return null
    }
    return this.mapVideoRecordToFetchedPost(video)
  }

  async getLiveSession(
    accessToken: string,
    roomId: string
  ): Promise<ProviderLiveSessionInfo | null> {
    const res = await this.fetchWithRetry(TIKTOK_LIVE_INFO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room_id: roomId,
      }),
    })

    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `TikTok live info request failed with status ${res.status}.`
      )
    }

    const json = (await res.json()) as {
      data?: {
        room_id?: string
        id?: string
        title?: string
        status?: string
        stream_url?: string
        viewer_count?: number
        peak_viewer_count?: number
        start_time?: number
        end_time?: number
      }
      error?: { code?: string | number; message?: string }
    }
    this.assertNoTikTokBodyError(json, "TikTok live session info")

    const data = json.data
    if (!data) {
      return null
    }

    const rawStatus = String(data.status || "live").toLowerCase()
    const status: LiveSessionStatus =
      rawStatus === "ended" || rawStatus === "end"
        ? "ended"
        : rawStatus === "scheduled"
          ? "scheduled"
          : "live"

    return {
      platform_live_id: String(data.room_id || data.id || roomId),
      title: data.title || `TikTok Live ${roomId}`,
      status,
      stream_url: data.stream_url ?? null,
      viewer_count:
        typeof data.viewer_count === "number" ? data.viewer_count : 0,
      peak_viewer_count:
        typeof data.peak_viewer_count === "number"
          ? data.peak_viewer_count
          : typeof data.viewer_count === "number"
            ? data.viewer_count
            : 0,
      started_at:
        typeof data.start_time === "number"
          ? new Date(data.start_time * 1000)
          : null,
      ended_at:
        typeof data.end_time === "number"
          ? new Date(data.end_time * 1000)
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
    const res = await this.fetchWithRetry(TIKTOK_CATALOG_URL, {
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
