import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  SocialAccount,
  SocialMediaPost,
  SocialProductTag,
  LiveSession,
  LiveProduct,
  CatalogSyncItem,
} from "../models/index"
import { verifyFeedTokenConstantTime } from "../utils/security"
import { TikTokProvider } from "../providers/tiktok.provider"
import { MetaGraphProvider } from "../providers/meta-graph.provider"
import {
  InventoryReservationService,
  type RedisLikeClient,
} from "./inventory-reservation.service"
import {
  CatalogFeedService,
  type GenerateCatalogFeedOptions,
  type MapMedusaProductsOptions,
} from "./catalog-feed.service"
import {
  SocialCommerceRepository,
  type SocialCommerceOrmHost,
} from "./social-commerce.repository"
import { SocialAccountService } from "./social-account.service"
import { SocialMediaService } from "./social-media.service"
import { LiveShoppingService } from "./live-shopping.service"
import { SocialWebhookService } from "./social-webhook.service"
import type {
  AttachLiveProductInput,
  CatalogFeedProductItem,
  CatalogSyncBatchResult,
  CatalogSyncItemRecord,
  CheckoutHandoffInput,
  CheckoutHandoffResult,
  CreateLiveSessionInput,
  CreateLocalStoryInput,
  IncomingWebhookResult,
  LiveProductRecord,
  LiveSessionRecord,
  LiveSessionStatus,
  MediaType,
  PostStatus,
  ReservationRecord,
  ReserveLiveStockInput,
  SocialAccountPublicDTO,
  SocialAccountRecord,
  SocialAccountStatus,
  SocialCommerceModuleOptions,
  SocialMediaPostRecord,
  SocialPlatform,
  SocialPlatformProvider,
  SocialProductTagRecord,
  SyncAccountMediaOptions,
  TagProductInput,
} from "../types/index"

/**
 * Main service facade for `medusa-plugin-social-commerce`.
 *
 * Coordinates specialized sub-services:
 * - `SocialAccountService` (OAuth 2.0 PKCE, AES-256-GCM token encryption, rotation)
 * - `SocialMediaService` (Shoppable Video/Image Feeds, 24h Stories, Product Tagging)
 * - `LiveShoppingService` + `InventoryReservationService` (Live Sessions & Flash-Sale Stock)
 * - `CatalogFeedService` (Outbound Catalog Sync, XML/CSV/JSON Feeds & Checkout Handoff)
 * - `SocialWebhookService` (Constant-Time HMAC-SHA256 Verification & Event Ingestion)
 */
export class SocialCommerceService extends MedusaService({
  SocialAccount,
  SocialMediaPost,
  SocialProductTag,
  LiveSession,
  LiveProduct,
  CatalogSyncItem,
}) {
  protected readonly moduleOptions: SocialCommerceModuleOptions
  protected readonly providers = new Map<SocialPlatform, SocialPlatformProvider>()

  public readonly repository: SocialCommerceRepository
  public readonly reservationService: InventoryReservationService
  public readonly catalogFeedService: CatalogFeedService
  public readonly accountService: SocialAccountService
  public readonly mediaService: SocialMediaService
  public readonly liveShoppingService: LiveShoppingService
  public readonly webhookService: SocialWebhookService

  constructor(
    container?: Record<string, unknown>,
    options?: SocialCommerceModuleOptions & {
      redisClient?: RedisLikeClient | null
    }
  ) {
    super(...arguments)
    this.moduleOptions = options ?? {}

    this.repository = new SocialCommerceRepository(
      this as unknown as SocialCommerceOrmHost
    )

    this.reservationService = new InventoryReservationService({
      redisClient: options?.redisClient ?? null,
      defaultTtlSeconds: options?.reservation_ttl_seconds ?? 600,
    })

    this.catalogFeedService = new CatalogFeedService({
      storefrontUrl: options?.storefront_url,
      brandName: options?.default_brand_name,
      defaultCurrency: options?.default_currency,
      beforeFeedItem: options?.before_feed_item,
    })

    const resolveProviderBound = (platform: SocialPlatform) =>
      this.resolveProviderSync(platform)
    const getOptionalProviderBound = (platform: SocialPlatform) =>
      this.providers.get(platform)

    this.accountService = new SocialAccountService(
      this.repository,
      this.moduleOptions,
      resolveProviderBound,
      getOptionalProviderBound
    )

    this.mediaService = new SocialMediaService(
      this.repository,
      this.accountService,
      resolveProviderBound
    )

    this.liveShoppingService = new LiveShoppingService(
      this.repository,
      this.reservationService
    )

    this.webhookService = new SocialWebhookService(
      this.repository,
      this.moduleOptions,
      this.accountService,
      this.mediaService,
      this.liveShoppingService,
      resolveProviderBound
    )

    this.initializeDefaultProviders()
  }

  private initializeDefaultProviders(): void {
    this.providers.set(
      "tiktok",
      new TikTokProvider({
        clientKey:
          this.moduleOptions.tiktok?.client_key || process.env.TIKTOK_CLIENT_KEY,
        clientSecret:
          this.moduleOptions.tiktok?.client_secret || process.env.TIKTOK_CLIENT_SECRET,
        redirectUri:
          this.moduleOptions.tiktok?.redirect_uri || process.env.TIKTOK_REDIRECT_URI,
        shopId: this.moduleOptions.tiktok?.shop_id || process.env.TIKTOK_SHOP_ID,
      })
    )

    const metaConfig = {
      appId: this.moduleOptions.meta?.app_id || process.env.META_APP_ID,
      appSecret: this.moduleOptions.meta?.app_secret || process.env.META_APP_SECRET,
      redirectUri:
        this.moduleOptions.meta?.redirect_uri || process.env.META_REDIRECT_URI,
      graphApiVersion: this.moduleOptions.meta?.graph_api_version || "v20.0",
      catalogId: this.moduleOptions.meta?.catalog_id || process.env.META_CATALOG_ID,
    }

    this.providers.set("instagram", new MetaGraphProvider("instagram", metaConfig))
    this.providers.set("facebook", new MetaGraphProvider("facebook", metaConfig))
  }

  /**
   * Registers or overrides a social platform provider (useful for testing or custom networks).
   */
  async registerProvider(
    platform: SocialPlatform,
    provider: SocialPlatformProvider
  ): Promise<void> {
    this.providers.set(platform, provider)
  }

  private resolveProviderSync(platform: SocialPlatform): SocialPlatformProvider {
    const provider = this.providers.get(platform)
    if (!provider) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No provider registered for social platform "${platform}".`
      )
    }
    return provider
  }

  async getProvider(platform: SocialPlatform): Promise<SocialPlatformProvider> {
    return this.resolveProviderSync(platform)
  }

  // ===========================================================================
  // 1. OAuth 2.0 & Multi-Platform Social Account Management
  // ===========================================================================

  async sanitizeAccount(account: SocialAccountRecord): Promise<SocialAccountPublicDTO> {
    return this.accountService.sanitizeAccount(account)
  }

  async buildOAuthConnectUrl(input: {
    platform: SocialPlatform
    redirect_uri?: string
    scopes?: string[]
  }) {
    return this.accountService.buildOAuthConnectUrl(input)
  }

  async generateOAuthConnectUrl(input: {
    platform: SocialPlatform
    redirect_uri?: string
    scopes?: string[]
  }) {
    return this.accountService.buildOAuthConnectUrl(input)
  }

  async exchangeOAuthCallback(input: {
    code: string
    state: string
    redirect_uri?: string
  }): Promise<SocialAccountPublicDTO> {
    return this.accountService.exchangeOAuthCallback(input)
  }

  async completeOAuthCallback(input: {
    code: string
    state: string
    redirect_uri?: string
  }): Promise<SocialAccountPublicDTO> {
    return this.accountService.exchangeOAuthCallback(input)
  }

  async listAccounts(filters?: {
    platform?: SocialPlatform
    status?: SocialAccountStatus
  }): Promise<SocialAccountPublicDTO[]> {
    return this.accountService.listAccounts(filters)
  }

  async getAccount(accountId: string): Promise<SocialAccountPublicDTO> {
    return this.accountService.getAccount(accountId)
  }

  async updateAccountMetadata(
    accountId: string,
    metadata: Record<string, unknown> | null
  ): Promise<SocialAccountPublicDTO> {
    return this.accountService.updateAccountMetadata(accountId, metadata)
  }

  async refreshAccountTokens(accountId: string): Promise<SocialAccountPublicDTO> {
    return this.accountService.refreshAccountTokens(accountId)
  }

  async refreshAccountToken(accountId: string): Promise<SocialAccountPublicDTO> {
    return this.accountService.refreshAccountTokens(accountId)
  }

  async refreshExpiringAccounts(thresholdMinutes: number = 60) {
    return this.accountService.refreshExpiringAccounts(thresholdMinutes)
  }

  async disconnectAccount(accountId: string, hardDelete: boolean = false) {
    return this.accountService.disconnectAccount(accountId, hardDelete)
  }

  // ===========================================================================
  // 2. Unified Media Posts & Ephemeral Stories Sync / Management
  // ===========================================================================

  async syncAccountMedia(accountId: string, options?: SyncAccountMediaOptions) {
    return this.mediaService.syncAccountMedia(accountId, options)
  }

  async syncAllAccountsMedia(options?: {
    platform?: SocialPlatform
    includeStories?: boolean
  }) {
    return this.mediaService.syncAllAccountsMedia(options)
  }

  async publishLocalStory(input: CreateLocalStoryInput) {
    return this.mediaService.publishLocalStory(input)
  }

  async createLocalStory(input: CreateLocalStoryInput) {
    return this.mediaService.publishLocalStory(input)
  }

  async listMediaPosts(filters?: {
    platform?: SocialPlatform
    media_type?: MediaType
    status?: PostStatus
    is_shoppable?: boolean
    is_featured?: boolean
    include_expired?: boolean
    limit?: number
    offset?: number
  }) {
    return this.mediaService.listMediaPosts(filters)
  }

  async listActiveStories(
    filters?: {
      platform?: SocialPlatform
      is_featured?: boolean
      limit?: number
    },
    nowMs: number = Date.now()
  ) {
    return this.mediaService.listActiveStories(filters, nowMs)
  }

  async getMediaPostWithTags(postId: string) {
    return this.mediaService.getMediaPostWithTags(postId)
  }

  async modifyMediaPost(
    postId: string,
    patch: Parameters<SocialMediaService["modifyMediaPost"]>[1]
  ): Promise<SocialMediaPostRecord> {
    return this.mediaService.modifyMediaPost(postId, patch)
  }

  async updateMediaPost(
    postId: string,
    patch: Parameters<SocialMediaService["modifyMediaPost"]>[1]
  ): Promise<SocialMediaPostRecord> {
    return this.mediaService.modifyMediaPost(postId, patch)
  }

  async purgeMediaPost(postId: string) {
    return this.mediaService.purgeMediaPost(postId)
  }

  async deleteMediaPost(postId: string) {
    return this.mediaService.purgeMediaPost(postId)
  }

  // ===========================================================================
  // 3. Product & Variant Tagging (Video Timestamps + Image/Story Hotspots)
  // ===========================================================================

  async tagProductsOnPost(
    postId: string,
    tags: TagProductInput[],
    replaceExisting: boolean = false
  ): Promise<SocialProductTagRecord[]> {
    return this.mediaService.tagProductsOnPost(postId, tags, replaceExisting)
  }

  async listPostsForProduct(productId: string) {
    return this.mediaService.listPostsForProduct(productId)
  }

  // ===========================================================================
  // 4. Live Shopping Sessions & Flash-Sale Stock Reservations
  // ===========================================================================

  async scheduleLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionRecord> {
    return this.liveShoppingService.scheduleLiveSession(input)
  }

  async createLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionRecord> {
    return this.liveShoppingService.scheduleLiveSession(input)
  }

  async pinProductsToLiveSession(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<LiveProductRecord[]> {
    return this.liveShoppingService.pinProductsToLiveSession(sessionId, products)
  }

  async attachProductsToLiveSession(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<LiveProductRecord[]> {
    return this.liveShoppingService.pinProductsToLiveSession(sessionId, products)
  }

  async startLiveSession(
    sessionId: string,
    options?: { stream_url?: string; platform_live_id?: string; external_id?: string }
  ): Promise<LiveSessionRecord> {
    return this.liveShoppingService.startLiveSession(sessionId, options)
  }

  async endLiveSession(sessionId: string) {
    return this.liveShoppingService.endLiveSession(sessionId)
  }

  async listLiveSessionsWithStock(filters?: {
    platform?: SocialPlatform
    status?: LiveSessionStatus
    social_account_id?: string
  }) {
    return this.liveShoppingService.listLiveSessionsWithStock(filters)
  }

  async reserveLiveProductStock(
    input: ReserveLiveStockInput,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord> {
    return this.liveShoppingService.reserveLiveProductStock(input, nowMs)
  }

  async confirmLiveProductReservation(reservationId: string) {
    return this.liveShoppingService.confirmLiveProductReservation(reservationId)
  }

  // ===========================================================================
  // 5. Outbound Product Catalog Sync & Social Checkout Handoff
  // ===========================================================================

  async syncProductsToSocialCatalog(
    accountId: string,
    items: CatalogFeedProductItem[],
    options?: {
      externalCatalogId?: string
    }
  ): Promise<CatalogSyncBatchResult> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one CatalogFeedProductItem is required to sync to a social catalog."
      )
    }

    const { account, accessToken } =
      await this.accountService.getDecryptedAccountWithToken(accountId)
    const provider = this.resolveProviderSync(account.platform)
    if (typeof provider.syncCatalogBatch !== "function") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Provider for platform "${account.platform}" does not support direct catalog batch sync.`
      )
    }

    const externalCatalogId =
      options?.externalCatalogId ||
      account.external_catalog_id ||
      account.external_shop_id ||
      (account.platform === "tiktok"
        ? this.moduleOptions.tiktok?.shop_id
        : this.moduleOptions.meta?.catalog_id) ||
      ""

    if (!externalCatalogId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `No external_catalog_id or shop_id configured for ${account.platform} account "${account.id}".`
      )
    }

    const batchResult = await provider.syncCatalogBatch(accessToken, {
      externalCatalogId,
      items,
    })

    const errorMap = new Map(
      batchResult.errors.map((e) => [e.variant_id, e.message])
    )
    const now = new Date()

    for (const item of items) {
      const existing = await this.repository.listCatalogItems({
        social_account_id: account.id,
        variant_id: item.id,
      })

      const errMsg = errorMap.get(item.id) ?? null
      const syncStatus = errMsg ? "failed" : "synced"

      if (existing.length > 0) {
        await this.repository.updateCatalogItem(existing[0].id, {
          external_catalog_id: externalCatalogId,
          external_product_id: item.id,
          external_item_id: item.id,
          sync_status: syncStatus,
          status: syncStatus,
          last_synced_at: now,
          error_message: errMsg,
        })
      } else {
        await this.repository.createCatalogItem({
          social_account_id: account.id,
          account_id: account.id,
          platform: account.platform,
          product_id: item.item_group_id,
          variant_id: item.id,
          external_catalog_id: externalCatalogId,
          external_product_id: item.id,
          external_item_id: item.id,
          sync_status: syncStatus,
          status: syncStatus,
          content_hash: null,
          last_synced_at: now,
          error_message: errMsg,
          metadata: null,
        })
      }
    }

    return batchResult
  }

  async listCatalogItems(filters?: {
    social_account_id?: string
    platform?: SocialPlatform
    sync_status?: "pending" | "synced" | "failed"
    product_id?: string
  }): Promise<CatalogSyncItemRecord[]> {
    return this.repository.listCatalogItems(
      filters as Record<string, unknown> | undefined
    )
  }

  async isFeedTokenRequired(): Promise<boolean> {
    const expected =
      this.moduleOptions.feed_token ||
      process.env.SOCIAL_COMMERCE_FEED_TOKEN ||
      process.env.SC_FEED_TOKEN
    return Boolean(expected && expected.trim().length > 0)
  }

  async verifyCatalogFeedToken(providedToken?: string | null): Promise<boolean> {
    const expected =
      this.moduleOptions.feed_token ||
      process.env.SOCIAL_COMMERCE_FEED_TOKEN ||
      process.env.SC_FEED_TOKEN

    if (!expected || !expected.trim()) {
      return true
    }

    if (!verifyFeedTokenConstantTime(expected, providedToken)) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or missing catalog feed token."
      )
    }

    return true
  }

  async mapMedusaProductsToFeedItems(
    products: Array<Record<string, unknown>>,
    options?: MapMedusaProductsOptions
  ): Promise<CatalogFeedProductItem[]> {
    return this.catalogFeedService.mapMedusaProductsToFeedItems(products, options)
  }

  async renderCatalogFeed(
    items: CatalogFeedProductItem[],
    options?: GenerateCatalogFeedOptions
  ) {
    return this.catalogFeedService.generateFeed(items, options)
  }

  async generateCatalogFeed(
    items: CatalogFeedProductItem[],
    options?: GenerateCatalogFeedOptions
  ) {
    return this.renderCatalogFeed(items, options)
  }

  async createCheckoutHandoff(
    input: CheckoutHandoffInput,
    options?: {
      cartId?: string | null
      storefrontBaseUrl?: string
    }
  ): Promise<CheckoutHandoffResult> {
    if (input.reservation_id?.trim()) {
      const reservation = await this.reservationService.getReservation(
        input.reservation_id.trim()
      )
      if (!reservation || reservation.status !== "held") {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          `Live stock reservation "${input.reservation_id}" has expired or is no longer active.`
        )
      }
    }

    return this.catalogFeedService.buildCheckoutHandoff(input, options)
  }

  // ===========================================================================
  // 6. Webhook Signature Verification & Real Event Ingestion
  // ===========================================================================

  async verifyWebhookSignature(
    platform: SocialPlatform,
    rawBody: string | Buffer,
    signatureHeader: string | undefined | null
  ): Promise<boolean> {
    return this.webhookService.verifyWebhookSignature(
      platform,
      rawBody,
      signatureHeader
    )
  }

  async handleIncomingWebhook(
    platform: SocialPlatform,
    payload: Record<string, unknown>
  ): Promise<IncomingWebhookResult> {
    return this.webhookService.handleIncomingWebhook(platform, payload)
  }
}
