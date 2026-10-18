import { MedusaError } from "@medusajs/framework/utils"
import { verifyWebhookHmacSha256 } from "../utils/security"
import type {
  IncomingWebhookResult,
  SocialCommerceModuleOptions,
  SocialPlatform,
  SocialPlatformProvider,
} from "../types/index"
import type { SocialCommerceRepository } from "./social-commerce.repository"
import type { SocialAccountService } from "./social-account.service"
import type { SocialMediaService } from "./social-media.service"
import type { LiveShoppingService } from "./live-shopping.service"

/**
 * Verifies HMAC-SHA256 webhook signatures and ingests incoming TikTok & Meta
 * webhook events (`user.video.publish`, `live.room.status_update`, `live.started`,
 * `live.ended`, and Meta `entry` changes).
 */
export class SocialWebhookService {
  private readonly repo: SocialCommerceRepository
  private readonly moduleOptions: SocialCommerceModuleOptions
  private readonly accountService: SocialAccountService
  private readonly mediaService: SocialMediaService
  private readonly liveShoppingService: LiveShoppingService
  private readonly resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider

  constructor(
    repo: SocialCommerceRepository,
    moduleOptions: SocialCommerceModuleOptions,
    accountService: SocialAccountService,
    mediaService: SocialMediaService,
    liveShoppingService: LiveShoppingService,
    resolveProvider: (platform: SocialPlatform) => SocialPlatformProvider
  ) {
    this.repo = repo
    this.moduleOptions = moduleOptions
    this.accountService = accountService
    this.mediaService = mediaService
    this.liveShoppingService = liveShoppingService
    this.resolveProvider = resolveProvider
  }

  /**
   * Verifies incoming TikTok / Meta webhook payloads using constant-time HMAC-SHA256.
   */
  async verifyWebhookSignature(
    platform: SocialPlatform,
    rawBody: string | Buffer,
    signatureHeader: string | undefined | null
  ): Promise<boolean> {
    const secret =
      platform === "tiktok"
        ? this.moduleOptions.tiktok?.webhook_secret ||
          this.moduleOptions.tiktok?.client_secret ||
          process.env.TIKTOK_WEBHOOK_SECRET ||
          process.env.TIKTOK_CLIENT_SECRET
        : this.moduleOptions.meta?.webhook_secret ||
          this.moduleOptions.meta?.app_secret ||
          process.env.META_WEBHOOK_SECRET ||
          process.env.META_APP_SECRET

    if (!secret) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Webhook secret is not configured for platform "${platform}".`
      )
    }

    const isValid = verifyWebhookHmacSha256(rawBody, signatureHeader, secret)
    if (!isValid) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `Invalid webhook HMAC signature for platform "${platform}".`
      )
    }
    return true
  }

  /**
   * Processes incoming TikTok & Meta webhook events to automatically upsert
   * `SocialMediaPost` records or transition `LiveSession` states.
   */
  async handleIncomingWebhook(
    platform: SocialPlatform,
    payload: Record<string, unknown>
  ): Promise<IncomingWebhookResult> {
    const rawEvent =
      typeof payload.event === "string"
        ? payload.event
        : typeof payload.type === "string"
          ? payload.type
          : "unknown"

    const dataObj = this.extractDataObject(payload)
    const openId = String(
      dataObj.open_id ||
        dataObj.user_openid ||
        payload.open_id ||
        payload.user_openid ||
        ""
    ).trim()

    if (
      platform === "tiktok" &&
      (rawEvent === "user.video.publish" || rawEvent === "video.publish")
    ) {
      return this.handleTikTokVideoPublish(platform, rawEvent, payload, dataObj, openId)
    }

    if (
      rawEvent === "live.room.status_update" ||
      rawEvent === "live.started" ||
      rawEvent === "live.ended"
    ) {
      return this.handleLiveRoomStatusUpdate(platform, rawEvent, payload, dataObj, openId)
    }

    if (
      (platform === "instagram" || platform === "facebook") &&
      Array.isArray(payload.entry)
    ) {
      return this.handleMetaEntryChanges(platform, payload.entry, rawEvent)
    }

    return {
      handled: false,
      platform,
      event: rawEvent,
      action: "ignored",
    }
  }

  private extractDataObject(payload: Record<string, unknown>): Record<string, unknown> {
    if (typeof payload.data === "string") {
      try {
        return JSON.parse(payload.data) as Record<string, unknown>
      } catch {
        return payload
      }
    }
    if (
      payload.data &&
      typeof payload.data === "object" &&
      !Array.isArray(payload.data)
    ) {
      return payload.data as Record<string, unknown>
    }
    if (
      payload.content &&
      typeof payload.content === "object" &&
      !Array.isArray(payload.content)
    ) {
      return payload.content as Record<string, unknown>
    }
    return payload
  }

  private async handleTikTokVideoPublish(
    platform: SocialPlatform,
    rawEvent: string,
    payload: Record<string, unknown>,
    dataObj: Record<string, unknown>,
    openId: string
  ): Promise<IncomingWebhookResult> {
    const videoId = String(
      dataObj.video_id ||
        dataObj.item_id ||
        dataObj.post_id ||
        payload.video_id ||
        ""
    ).trim()

    const accounts = await this.repo.listAccounts({ platform: "tiktok" })
    const account =
      (openId
        ? accounts.find(
            (a) => a.platform_user_id === openId || a.external_id === openId
          )
        : undefined) ?? accounts.find((a) => a.status === "active")

    if (!account) {
      return {
        handled: false,
        platform,
        event: rawEvent,
        action: "account_not_found",
      }
    }

    if (!videoId) {
      const synced = await this.mediaService.syncAccountMedia(account.id)
      return {
        handled: true,
        platform,
        event: rawEvent,
        action: "account_media_synced",
        account_id: account.id,
        post: synced.posts[0],
      }
    }

    const { accessToken } = await this.accountService.getDecryptedAccountWithToken(
      account.id
    )
    const provider = this.resolveProvider("tiktok")
    const videoItem =
      typeof provider.getVideo === "function"
        ? await provider.getVideo(accessToken, videoId)
        : null

    if (!videoItem) {
      const synced = await this.mediaService.syncAccountMedia(account.id)
      const foundPost = synced.posts.find(
        (p) => p.platform_post_id === videoId || p.external_id === videoId
      )
      return {
        handled: true,
        platform,
        event: rawEvent,
        action: "video_synced_via_feed",
        account_id: account.id,
        post: foundPost,
      }
    }

    const { post: savedPost } = await this.mediaService.upsertFetchedPost(
      account,
      videoItem
    )

    return {
      handled: true,
      platform,
      event: rawEvent,
      action: "video_upserted",
      account_id: account.id,
      post: savedPost,
    }
  }

  private async handleLiveRoomStatusUpdate(
    platform: SocialPlatform,
    rawEvent: string,
    payload: Record<string, unknown>,
    dataObj: Record<string, unknown>,
    openId: string
  ): Promise<IncomingWebhookResult> {
    const roomId = String(
      dataObj.room_id ||
        dataObj.live_id ||
        dataObj.platform_live_id ||
        payload.room_id ||
        payload.live_id ||
        ""
    ).trim()
    const explicitSessionId = String(
      dataObj.session_id || payload.session_id || ""
    ).trim()

    const rawStatus =
      rawEvent === "live.started"
        ? "live"
        : rawEvent === "live.ended"
          ? "ended"
          : String(dataObj.status ?? payload.status ?? "").toLowerCase()

    const isLive =
      rawStatus === "live" ||
      rawStatus === "1" ||
      rawStatus === "started" ||
      rawStatus === "active"
    const isEnded =
      rawStatus === "ended" ||
      rawStatus === "2" ||
      rawStatus === "4" ||
      rawStatus === "finished" ||
      rawStatus === "closed"

    const accounts = await this.repo.listAccounts({ platform })
    const account =
      (openId
        ? accounts.find(
            (a) => a.platform_user_id === openId || a.external_id === openId
          )
        : undefined) ?? accounts.find((a) => a.status === "active")

    const allSessions = await this.repo.listLiveSessions(
      account ? { social_account_id: account.id } : { platform }
    )
    let existingSession = explicitSessionId
      ? await this.repo.retrieveLiveSession(explicitSessionId)
      : null
    if (!existingSession && roomId) {
      existingSession =
        allSessions.find(
          (s) => s.platform_live_id === roomId || s.external_id === roomId
        ) ?? null
    }

    if (isLive) {
      let liveInfo: Awaited<
        ReturnType<NonNullable<SocialPlatformProvider["getLiveSession"]>>
      > = null

      if (account && roomId) {
        try {
          const { accessToken } =
            await this.accountService.getDecryptedAccountWithToken(account.id)
          const provider = this.resolveProvider(platform)
          if (typeof provider.getLiveSession === "function") {
            liveInfo = await provider.getLiveSession(accessToken, roomId)
          }
        } catch {
          // Best-effort remote live info lookup
        }
      }

      const incomingViewerCount =
        typeof dataObj.viewer_count === "number"
          ? dataObj.viewer_count
          : (liveInfo?.viewer_count ?? existingSession?.viewer_count ?? 0)
      const peakViewerCount = Math.max(
        existingSession?.peak_viewer_count ?? 0,
        liveInfo?.peak_viewer_count ?? 0,
        incomingViewerCount
      )

      if (existingSession) {
        const started = await this.liveShoppingService.startLiveSession(
          existingSession.id,
          {
            platform_live_id:
              roomId || existingSession.platform_live_id || undefined,
            stream_url:
              liveInfo?.stream_url ??
              (typeof dataObj.stream_url === "string"
                ? dataObj.stream_url
                : undefined),
          }
        )
        const updated = await this.repo.updateLiveSession(started.id, {
          title: liveInfo?.title || started.title,
          description: liveInfo?.description ?? started.description,
          playback_url: liveInfo?.playback_url ?? started.playback_url,
          viewer_count: incomingViewerCount,
          peak_viewer_count: peakViewerCount,
          metadata: {
            ...(started.metadata ?? {}),
            ...(liveInfo?.metadata ?? {}),
          },
        })
        return {
          handled: true,
          platform,
          event: rawEvent,
          action: "live_session_started",
          account_id: updated.social_account_id,
          session: updated,
        }
      }

      if (!account) {
        return {
          handled: false,
          platform,
          event: rawEvent,
          action: "account_not_found",
        }
      }

      const created = await this.liveShoppingService.scheduleLiveSession({
        social_account_id: account.id,
        platform,
        platform_live_id: roomId || null,
        title:
          liveInfo?.title ||
          (typeof dataObj.title === "string" && dataObj.title.trim()
            ? dataObj.title.trim()
            : `Live Stream ${roomId || new Date().toISOString()}`),
        description: liveInfo?.description ?? null,
        stream_url:
          liveInfo?.stream_url ??
          (typeof dataObj.stream_url === "string" ? dataObj.stream_url : null),
        playback_url: liveInfo?.playback_url ?? null,
        metadata: liveInfo?.metadata ?? null,
      })
      const started = await this.liveShoppingService.startLiveSession(created.id, {
        platform_live_id: roomId || undefined,
        stream_url: liveInfo?.stream_url ?? undefined,
      })
      const updated = await this.repo.updateLiveSession(started.id, {
        viewer_count: incomingViewerCount,
        peak_viewer_count: peakViewerCount,
      })
      return {
        handled: true,
        platform,
        event: rawEvent,
        action: "live_session_started",
        account_id: account.id,
        session: updated,
      }
    }

    if (isEnded && existingSession) {
      const ended = await this.liveShoppingService.endLiveSession(existingSession.id)
      return {
        handled: true,
        platform,
        event: rawEvent,
        action: "live_session_ended",
        account_id: existingSession.social_account_id,
        session: ended.session,
        released_reservations: ended.released_reservations,
      }
    }

    return {
      handled: false,
      platform,
      event: rawEvent,
      action: "no_matching_live_session",
    }
  }

  private async handleMetaEntryChanges(
    platform: SocialPlatform,
    entries: unknown[],
    rawEvent: string
  ): Promise<IncomingWebhookResult> {
    const accounts = await this.repo.listAccounts({ platform })
    for (const entryItem of entries) {
      if (!entryItem || typeof entryItem !== "object") continue
      const entryRecord = entryItem as Record<string, unknown>
      const entryId = String(entryRecord.id ?? "").trim()
      const account =
        (entryId
          ? accounts.find(
              (a) => a.platform_user_id === entryId || a.external_id === entryId
            )
          : undefined) ?? accounts.find((a) => a.status === "active")

      if (account) {
        const synced = await this.mediaService.syncAccountMedia(account.id)
        return {
          handled: true,
          platform,
          event: "meta.entry.changes",
          action: "account_media_synced",
          account_id: account.id,
          post: synced.posts[0],
        }
      }
    }

    return {
      handled: false,
      platform,
      event: rawEvent,
      action: "ignored",
    }
  }
}
