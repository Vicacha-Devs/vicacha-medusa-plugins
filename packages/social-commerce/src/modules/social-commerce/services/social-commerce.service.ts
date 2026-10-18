import { randomUUID } from "node:crypto"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  SocialAccount,
  SocialMediaPost,
  SocialProductTag,
  LiveSession,
  LiveProduct,
  CatalogSyncItem,
} from "../models/index.js"
import {
  createPkceChallenge,
  createSignedOAuthState,
  decryptToken,
  encryptToken,
  resolveEncryptionPassphrase,
  sanitizeHttpUrl,
  verifyFeedTokenConstantTime,
  verifySignedOAuthState,
  verifyWebhookHmacSha256,
} from "../utils/security.js"
import { TikTokProvider } from "../providers/tiktok.provider.js"
import { MetaGraphProvider } from "../providers/meta-graph.provider.js"
import {
  InventoryReservationService,
  type RedisLikeClient,
} from "./inventory-reservation.service.js"
import {
  CatalogFeedService,
  type GenerateCatalogFeedOptions,
  type MapMedusaProductsOptions,
} from "./catalog-feed.service.js"
import type {
  AttachLiveProductInput,
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
  SocialAccountRecord,
  SocialAccountStatus,
  SocialCommerceModuleOptions,
  SocialMediaPostRecord,
  SocialPlatform,
  SocialPlatformProvider,
  SocialProductTagRecord,
  TagProductInput,
} from "../types/index.js"

function matchesFilter<T extends Record<string, unknown>>(
  record: T,
  filters?: Record<string, unknown>
): boolean {
  if (!filters) return true
  for (const [key, expected] of Object.entries(filters)) {
    if (expected === undefined) continue
    const actual = record[key]
    if (Array.isArray(expected)) {
      if (!expected.includes(actual)) return false
    } else if (actual !== expected) {
      return false
    }
  }
  return true
}

/**
 * Main service for `medusa-plugin-social-commerce`.
 *
 * Unifies multi-network Shoppable Video/Image Feeds, Ephemeral 24h Stories
 * (`@bambiste/medusa-stories` superset), Live Shopping with Flash-Sale Stock
 * Reservations, Outbound Product Catalog Sync, and Social Checkout Handoff.
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
  protected readonly pkceVerifiers = new Map<string, string>()

  public readonly reservationService: InventoryReservationService
  public readonly catalogFeedService: CatalogFeedService

  // Standalone in-memory stores used when MikroORM repositories are not injected
  private readonly memAccounts = new Map<string, SocialAccountRecord>()
  private readonly memPosts = new Map<string, SocialMediaPostRecord>()
  private readonly memTags = new Map<string, SocialProductTagRecord>()
  private readonly memLiveSessions = new Map<string, LiveSessionRecord>()
  private readonly memLiveProducts = new Map<string, LiveProductRecord>()
  private readonly memCatalogItems = new Map<string, CatalogSyncItemRecord>()

  constructor(
    container?: Record<string, unknown>,
    options?: SocialCommerceModuleOptions & {
      redisClient?: RedisLikeClient | null
    }
  ) {
    super(...arguments)
    this.moduleOptions = options ?? {}

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

  private getEncryptionSecret(): string {
    return resolveEncryptionPassphrase(this.moduleOptions.encryption_key)
  }

  // ===========================================================================
  // Repository Abstraction (MedusaService MikroORM + Standalone Memory Fallback)
  // ===========================================================================

  private hasInjectedOrmService(internalServiceKey: string): boolean {
    const container = (this as unknown as { __container__?: Record<string, unknown> })
      .__container__
    return Boolean(container && internalServiceKey in container)
  }

  private async repoCreateAccount(
    data: Omit<SocialAccountRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialAccountRecord> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      const res = await this.createSocialAccounts(
        data as unknown as Parameters<typeof this.createSocialAccounts>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as SocialAccountRecord
    }
    const now = new Date()
    const record: SocialAccountRecord = {
      ...data,
      id: `sacc_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memAccounts.set(record.id, record)
    return { ...record }
  }

  private async repoUpdateAccount(
    id: string,
    patch: Partial<SocialAccountRecord>
  ): Promise<SocialAccountRecord> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      const res = await this.updateSocialAccounts({
        id,
        ...patch,
      } as unknown as Parameters<typeof this.updateSocialAccounts>[0])
      return (Array.isArray(res) ? res[0] : res) as unknown as SocialAccountRecord
    }
    const existing = this.memAccounts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount with id "${id}" was not found.`
      )
    }
    const updated: SocialAccountRecord = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    }
    this.memAccounts.set(id, updated)
    return { ...updated }
  }

  private async repoRetrieveAccount(id: string): Promise<SocialAccountRecord | null> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      try {
        return (await this.retrieveSocialAccount(id)) as unknown as SocialAccountRecord
      } catch {
        return null
      }
    }
    const found = this.memAccounts.get(id)
    return found ? { ...found } : null
  }

  private async repoListAccounts(
    filters?: Record<string, unknown>
  ): Promise<SocialAccountRecord[]> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      return (await this.listSocialAccounts(
        filters ?? {}
      )) as unknown as SocialAccountRecord[]
    }
    return Array.from(this.memAccounts.values())
      .filter((a) => matchesFilter(a as unknown as Record<string, unknown>, filters))
      .map((a) => ({ ...a }))
  }

  private async repoDeleteAccount(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialAccountService")) {
      await this.deleteSocialAccounts([id])
      return
    }
    this.memAccounts.delete(id)
  }

  private async repoCreatePost(
    data: Omit<SocialMediaPostRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialMediaPostRecord> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      const res = await this.createSocialMediaPosts(
        data as unknown as Parameters<typeof this.createSocialMediaPosts>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as SocialMediaPostRecord
    }
    const now = new Date()
    const record: SocialMediaPostRecord = {
      ...data,
      id: `spost_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memPosts.set(record.id, record)
    return { ...record }
  }

  private async repoUpdatePost(
    id: string,
    patch: Partial<SocialMediaPostRecord>
  ): Promise<SocialMediaPostRecord> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      const res = await this.updateSocialMediaPosts({
        id,
        ...patch,
      } as unknown as Parameters<typeof this.updateSocialMediaPosts>[0])
      return (Array.isArray(res) ? res[0] : res) as unknown as SocialMediaPostRecord
    }
    const existing = this.memPosts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost with id "${id}" was not found.`
      )
    }
    const updated: SocialMediaPostRecord = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    }
    this.memPosts.set(id, updated)
    return { ...updated }
  }

  private async repoRetrievePost(id: string): Promise<SocialMediaPostRecord | null> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      try {
        return (await this.retrieveSocialMediaPost(
          id
        )) as unknown as SocialMediaPostRecord
      } catch {
        return null
      }
    }
    const found = this.memPosts.get(id)
    return found ? { ...found } : null
  }

  private async repoListPosts(
    filters?: Record<string, unknown>
  ): Promise<SocialMediaPostRecord[]> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      return (await this.listSocialMediaPosts(
        filters ?? {}
      )) as unknown as SocialMediaPostRecord[]
    }
    return Array.from(this.memPosts.values())
      .filter((p) => matchesFilter(p as unknown as Record<string, unknown>, filters))
      .map((p) => ({ ...p }))
  }

  private async repoDeletePost(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialMediaPostService")) {
      await this.deleteSocialMediaPosts([id])
      return
    }
    this.memPosts.delete(id)
  }

  private async repoCreateTag(
    data: Omit<SocialProductTagRecord, "id" | "created_at" | "updated_at">
  ): Promise<SocialProductTagRecord> {
    if (this.hasInjectedOrmService("socialProductTagService")) {
      const res = await this.createSocialProductTags(
        data as unknown as Parameters<typeof this.createSocialProductTags>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as SocialProductTagRecord
    }
    const now = new Date()
    const record: SocialProductTagRecord = {
      ...data,
      id: `stag_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memTags.set(record.id, record)
    return { ...record }
  }

  private async repoListTags(
    filters?: Record<string, unknown>
  ): Promise<SocialProductTagRecord[]> {
    if (this.hasInjectedOrmService("socialProductTagService")) {
      return (await this.listSocialProductTags(
        filters ?? {}
      )) as unknown as SocialProductTagRecord[]
    }
    return Array.from(this.memTags.values())
      .filter((t) => matchesFilter(t as unknown as Record<string, unknown>, filters))
      .map((t) => ({ ...t }))
  }

  private async repoDeleteTag(id: string): Promise<void> {
    if (this.hasInjectedOrmService("socialProductTagService")) {
      await this.deleteSocialProductTags([id])
      return
    }
    this.memTags.delete(id)
  }

  private async repoCreateLiveSession(
    data: Omit<LiveSessionRecord, "id" | "created_at" | "updated_at">
  ): Promise<LiveSessionRecord> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      const res = await this.createLiveSessions(
        data as unknown as Parameters<typeof this.createLiveSessions>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as LiveSessionRecord
    }
    const now = new Date()
    const record: LiveSessionRecord = {
      ...data,
      id: `lsess_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memLiveSessions.set(record.id, record)
    return { ...record }
  }

  private async repoUpdateLiveSession(
    id: string,
    patch: Partial<LiveSessionRecord>
  ): Promise<LiveSessionRecord> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      const res = await this.updateLiveSessions({
        id,
        ...patch,
      } as unknown as Parameters<typeof this.updateLiveSessions>[0])
      return (Array.isArray(res) ? res[0] : res) as unknown as LiveSessionRecord
    }
    const existing = this.memLiveSessions.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession with id "${id}" was not found.`
      )
    }
    const updated: LiveSessionRecord = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    }
    this.memLiveSessions.set(id, updated)
    return { ...updated }
  }

  private async repoRetrieveLiveSession(id: string): Promise<LiveSessionRecord | null> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      try {
        return (await this.retrieveLiveSession(id)) as unknown as LiveSessionRecord
      } catch {
        return null
      }
    }
    const found = this.memLiveSessions.get(id)
    return found ? { ...found } : null
  }

  private async repoListLiveSessions(
    filters?: Record<string, unknown>
  ): Promise<LiveSessionRecord[]> {
    if (this.hasInjectedOrmService("liveSessionService")) {
      return (await this.listLiveSessions(
        filters ?? {}
      )) as unknown as LiveSessionRecord[]
    }
    return Array.from(this.memLiveSessions.values())
      .filter((s) => matchesFilter(s as unknown as Record<string, unknown>, filters))
      .map((s) => ({ ...s }))
  }

  private async repoCreateLiveProduct(
    data: Omit<LiveProductRecord, "id" | "created_at" | "updated_at">
  ): Promise<LiveProductRecord> {
    if (this.hasInjectedOrmService("liveProductService")) {
      const res = await this.createLiveProducts(
        data as unknown as Parameters<typeof this.createLiveProducts>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as LiveProductRecord
    }
    const now = new Date()
    const record: LiveProductRecord = {
      ...data,
      id: `lprod_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memLiveProducts.set(record.id, record)
    return { ...record }
  }

  private async repoUpdateLiveProduct(
    id: string,
    patch: Partial<LiveProductRecord>
  ): Promise<LiveProductRecord> {
    if (this.hasInjectedOrmService("liveProductService")) {
      const res = await this.updateLiveProducts({
        id,
        ...patch,
      } as unknown as Parameters<typeof this.updateLiveProducts>[0])
      return (Array.isArray(res) ? res[0] : res) as unknown as LiveProductRecord
    }
    const existing = this.memLiveProducts.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveProduct with id "${id}" was not found.`
      )
    }
    const updated: LiveProductRecord = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    }
    this.memLiveProducts.set(id, updated)
    return { ...updated }
  }

  private async repoListLiveProducts(
    filters?: Record<string, unknown>
  ): Promise<LiveProductRecord[]> {
    if (this.hasInjectedOrmService("liveProductService")) {
      return (await this.listLiveProducts(
        filters ?? {}
      )) as unknown as LiveProductRecord[]
    }
    return Array.from(this.memLiveProducts.values())
      .filter((p) => matchesFilter(p as unknown as Record<string, unknown>, filters))
      .map((p) => ({ ...p }))
  }

  private async repoCreateCatalogItem(
    data: Omit<CatalogSyncItemRecord, "id" | "created_at" | "updated_at">
  ): Promise<CatalogSyncItemRecord> {
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      const res = await this.createCatalogSyncItems(
        data as unknown as Parameters<typeof this.createCatalogSyncItems>[0]
      )
      return (Array.isArray(res) ? res[0] : res) as unknown as CatalogSyncItemRecord
    }
    const now = new Date()
    const record: CatalogSyncItemRecord = {
      ...data,
      id: `csync_${randomUUID().replace(/-/g, "").slice(0, 20)}`,
      created_at: now,
      updated_at: now,
    }
    this.memCatalogItems.set(record.id, record)
    return { ...record }
  }

  private async repoUpdateCatalogItem(
    id: string,
    patch: Partial<CatalogSyncItemRecord>
  ): Promise<CatalogSyncItemRecord> {
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      const res = await this.updateCatalogSyncItems({
        id,
        ...patch,
      } as unknown as Parameters<typeof this.updateCatalogSyncItems>[0])
      return (Array.isArray(res) ? res[0] : res) as unknown as CatalogSyncItemRecord
    }
    const existing = this.memCatalogItems.get(id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `CatalogSyncItem with id "${id}" was not found.`
      )
    }
    const updated: CatalogSyncItemRecord = {
      ...existing,
      ...patch,
      id,
      updated_at: new Date(),
    }
    this.memCatalogItems.set(id, updated)
    return { ...updated }
  }

  private async repoListCatalogItems(
    filters?: Record<string, unknown>
  ): Promise<CatalogSyncItemRecord[]> {
    if (this.hasInjectedOrmService("catalogSyncItemService")) {
      return (await this.listCatalogSyncItems(
        filters ?? {}
      )) as unknown as CatalogSyncItemRecord[]
    }
    return Array.from(this.memCatalogItems.values())
      .filter((i) => matchesFilter(i as unknown as Record<string, unknown>, filters))
      .map((i) => ({ ...i }))
  }

  // ===========================================================================
  // 1. OAuth 2.0 & Multi-Platform Social Account Management
  // ===========================================================================

  private toPublicAccountDTO(account: SocialAccountRecord): SocialAccountPublicDTO {
    const { access_token: _at, refresh_token: _rt, ...safe } = account
    return safe
  }

  /**
   * Strips encrypted `access_token` and `refresh_token` before returning account data to API callers.
   */
  async sanitizeAccount(account: SocialAccountRecord): Promise<SocialAccountPublicDTO> {
    return this.toPublicAccountDTO(account)
  }

  /**
   * Generates a CSRF-protected and PKCE-enabled OAuth authorization URL for TikTok, Instagram, or Facebook.
   */
  async buildOAuthConnectUrl(input: {
    platform: SocialPlatform
    redirect_uri?: string
    scopes?: string[]
  }): Promise<{
    url: string
    state: string
    platform: SocialPlatform
  }> {
    if (input.platform === "local") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Platform "local" does not require external OAuth authorization.'
      )
    }

    const provider = this.resolveProviderSync(input.platform)
    const { codeVerifier, codeChallenge } = createPkceChallenge()
    const secret = this.getEncryptionSecret()

    const state = createSignedOAuthState(
      {
        platform: input.platform,
        nonce: randomUUID(),
        issuedAt: Date.now(),
        codeVerifier,
        redirectUri: input.redirect_uri,
      },
      secret
    )

    this.pkceVerifiers.set(state, codeVerifier)

    const url = provider.getAuthUrl({
      state,
      codeChallenge,
      redirectUri: input.redirect_uri,
      scopes: input.scopes,
    })

    return {
      url,
      state,
      platform: input.platform,
    }
  }

  async generateOAuthConnectUrl(input: {
    platform: SocialPlatform
    redirect_uri?: string
    scopes?: string[]
  }): Promise<{
    url: string
    state: string
    platform: SocialPlatform
  }> {
    return this.buildOAuthConnectUrl(input)
  }

  /**
   * Verifies the signed OAuth state, exchanges the authorization code for tokens,
   * encrypts tokens with AES-256-GCM, and creates or updates the `SocialAccount`.
   */
  async exchangeOAuthCallback(input: {
    code: string
    state: string
    redirect_uri?: string
  }): Promise<SocialAccountPublicDTO> {
    if (!input.code?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "OAuth authorization code is required."
      )
    }
    if (!input.state?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "OAuth state parameter is required."
      )
    }

    const secret = this.getEncryptionSecret()
    const verifiedState = verifySignedOAuthState(input.state, secret)
    const codeVerifier =
      this.pkceVerifiers.get(input.state) || verifiedState.codeVerifier
    this.pkceVerifiers.delete(input.state)

    const provider = this.resolveProviderSync(verifiedState.platform)
    const tokenResult = await provider.exchangeCodeForToken({
      code: input.code.trim(),
      codeVerifier,
      redirectUri: input.redirect_uri || verifiedState.redirectUri,
    })

    const encryptedAccess = encryptToken(tokenResult.access_token, secret)
    const encryptedRefresh = tokenResult.refresh_token
      ? encryptToken(tokenResult.refresh_token, secret)
      : null

    const expiresAt = tokenResult.expires_in
      ? new Date(Date.now() + tokenResult.expires_in * 1000)
      : null

    const existingList = await this.repoListAccounts({
      platform: verifiedState.platform,
      platform_user_id: tokenResult.platform_user_id,
    })

    if (existingList.length > 0) {
      const updated = await this.repoUpdateAccount(existingList[0].id, {
        platform_username: tokenResult.platform_username,
        display_name: tokenResult.display_name ?? existingList[0].display_name,
        avatar_url: tokenResult.avatar_url ?? existingList[0].avatar_url,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expires_at: expiresAt,
        scopes: tokenResult.scopes,
        external_catalog_id:
          tokenResult.external_catalog_id ?? existingList[0].external_catalog_id,
        external_shop_id:
          tokenResult.external_shop_id ?? existingList[0].external_shop_id,
        status: "active",
        metadata: {
          ...(existingList[0].metadata ?? {}),
          ...(tokenResult.metadata ?? {}),
        },
      })
      return this.toPublicAccountDTO(updated)
    }

    const created = await this.repoCreateAccount({
      platform: verifiedState.platform,
      platform_user_id: tokenResult.platform_user_id,
      platform_username: tokenResult.platform_username,
      display_name: tokenResult.display_name ?? tokenResult.platform_username,
      avatar_url: tokenResult.avatar_url ?? null,
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      scopes: tokenResult.scopes,
      external_catalog_id: tokenResult.external_catalog_id ?? null,
      external_shop_id: tokenResult.external_shop_id ?? null,
      status: "active",
      last_synced_at: null,
      metadata: tokenResult.metadata ?? null,
    })

    return this.toPublicAccountDTO(created)
  }

  async completeOAuthCallback(input: {
    code: string
    state: string
    redirect_uri?: string
  }): Promise<SocialAccountPublicDTO> {
    return this.exchangeOAuthCallback(input)
  }

  /**
   * Lists connected social accounts with encrypted credentials stripped.
   */
  async listAccounts(filters?: {
    platform?: SocialPlatform
    status?: SocialAccountStatus
  }): Promise<SocialAccountPublicDTO[]> {
    const accounts = await this.repoListAccounts(
      filters as Record<string, unknown> | undefined
    )
    return accounts.map((a) => this.toPublicAccountDTO(a))
  }

  /**
   * Retrieves a single social account (sanitized).
   */
  async getAccount(accountId: string): Promise<SocialAccountPublicDTO> {
    const account = await this.repoRetrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }
    return this.toPublicAccountDTO(account)
  }

  /**
   * Decrypts and returns the raw access token for internal provider API calls.
   */
  private async getDecryptedAccountWithToken(accountId: string): Promise<{
    account: SocialAccountRecord
    accessToken: string
    refreshToken: string | null
  }> {
    const account = await this.repoRetrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }
    if (account.status === "disconnected") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `SocialAccount "${accountId}" is disconnected.`
      )
    }

    const secret = this.getEncryptionSecret()
    const accessToken = decryptToken(account.access_token, secret)
    const refreshToken = account.refresh_token
      ? decryptToken(account.refresh_token, secret)
      : null

    return { account, accessToken, refreshToken }
  }

  /**
   * Refreshes OAuth tokens for a specific social account and re-encrypts at rest.
   */
  async refreshAccountTokens(accountId: string): Promise<SocialAccountPublicDTO> {
    const { account, accessToken, refreshToken } =
      await this.getDecryptedAccountWithToken(accountId)
    const provider = this.resolveProviderSync(account.platform)

    const tokenForRefresh = refreshToken || accessToken
    const refreshed = await provider.refreshAccessToken(tokenForRefresh)

    const secret = this.getEncryptionSecret()
    const encryptedAccess = encryptToken(refreshed.access_token, secret)
    const encryptedRefresh = refreshed.refresh_token
      ? encryptToken(refreshed.refresh_token, secret)
      : account.refresh_token

    const expiresAt = refreshed.expires_in
      ? new Date(Date.now() + refreshed.expires_in * 1000)
      : account.token_expires_at

    const updated = await this.repoUpdateAccount(account.id, {
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      status: "active",
    })

    return this.toPublicAccountDTO(updated)
  }

  /**
   * Proactively refreshes tokens for all active accounts expiring within `thresholdMinutes`.
   */
  async refreshExpiringAccounts(thresholdMinutes: number = 60): Promise<{
    refreshed: string[]
    failed: Array<{ account_id: string; error: string }>
  }> {
    const activeAccounts = await this.repoListAccounts({ status: "active" })
    const cutoff = Date.now() + thresholdMinutes * 60 * 1000
    const refreshed: string[] = []
    const failed: Array<{ account_id: string; error: string }> = []

    for (const acc of activeAccounts) {
      if (acc.platform === "local") continue
      const expiresMs = acc.token_expires_at
        ? new Date(acc.token_expires_at).getTime()
        : null
      if (expiresMs !== null && expiresMs <= cutoff) {
        try {
          await this.refreshAccountTokens(acc.id)
          refreshed.push(acc.id)
        } catch (err) {
          failed.push({
            account_id: acc.id,
            error: err instanceof Error ? err.message : String(err),
          })
        }
      }
    }

    return { refreshed, failed }
  }

  /**
   * Disconnects or deletes a social account.
   */
  async disconnectAccount(
    accountId: string,
    hardDelete: boolean = false
  ): Promise<{ id: string; status: "disconnected" | "deleted" }> {
    const account = await this.repoRetrieveAccount(accountId)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${accountId}" was not found.`
      )
    }

    if (hardDelete) {
      await this.repoDeleteAccount(accountId)
      return { id: accountId, status: "deleted" }
    }

    await this.repoUpdateAccount(accountId, {
      status: "disconnected",
    })
    return { id: accountId, status: "disconnected" }
  }

  // ===========================================================================
  // 2. Unified Media Posts & Ephemeral Stories Sync / Management
  // ===========================================================================

  /**
   * Syncs both permanent feed media (`video`, `reel`, `image`, `carousel`) and
   * 24h ephemeral stories (`story`) from a connected social account into `SocialMediaPost`.
   */
  async syncAccountMedia(
    accountId: string,
    options?: {
      includeStories?: boolean
      limit?: number
    }
  ): Promise<{
    account_id: string
    platform: SocialPlatform
    synced_posts: number
    synced_stories: number
    posts: SocialMediaPostRecord[]
  }> {
    const { account, accessToken } = await this.getDecryptedAccountWithToken(accountId)
    const provider = this.resolveProviderSync(account.platform)

    const { posts: fetchedFeed } = await provider.fetchMediaPosts(accessToken, {
      limit: options?.limit ?? 25,
      platformUserId: account.platform_user_id,
    })

    const includeStories = options?.includeStories !== false
    const fetchedStories =
      includeStories && typeof provider.fetchStories === "function"
        ? await provider.fetchStories(accessToken, {
            platformUserId: account.platform_user_id,
          })
        : []

    const combined = [...fetchedFeed, ...fetchedStories]
    const savedPosts: SocialMediaPostRecord[] = []
    let syncedPostsCount = 0
    let syncedStoriesCount = 0

    for (const item of combined) {
      const existing = await this.repoListPosts({
        platform: account.platform,
        platform_post_id: item.platform_post_id,
      })

      if (existing.length > 0) {
        const updated = await this.repoUpdatePost(existing[0].id, {
          caption: item.caption,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          duration: item.duration,
          view_count: item.view_count,
          like_count: item.like_count,
          comment_count: item.comment_count,
          share_count: item.share_count,
          expires_at: item.expires_at,
          metadata: {
            ...(existing[0].metadata ?? {}),
            ...(item.metadata ?? {}),
          },
        })
        savedPosts.push(updated)
      } else {
        const created = await this.repoCreatePost({
          social_account_id: account.id,
          platform: account.platform,
          platform_post_id: item.platform_post_id,
          media_type: item.media_type,
          caption: item.caption,
          media_url: item.media_url,
          thumbnail_url: item.thumbnail_url,
          permalink: item.permalink,
          duration: item.duration,
          view_count: item.view_count,
          like_count: item.like_count,
          comment_count: item.comment_count,
          share_count: item.share_count,
          published_at: item.published_at,
          expires_at: item.expires_at,
          is_shoppable: false,
          is_featured: false,
          sort_order: 0,
          author_name:
            item.author_name ?? account.display_name ?? account.platform_username,
          author_avatar_url: item.author_avatar_url ?? account.avatar_url,
          cta_text: null,
          cta_url: null,
          status: "active",
          metadata: item.metadata,
        })
        savedPosts.push(created)
      }

      if (item.media_type === "story") {
        syncedStoriesCount += 1
      } else {
        syncedPostsCount += 1
      }
    }

    await this.repoUpdateAccount(account.id, {
      last_synced_at: new Date(),
    })

    return {
      account_id: account.id,
      platform: account.platform,
      synced_posts: syncedPostsCount,
      synced_stories: syncedStoriesCount,
      posts: savedPosts,
    }
  }

  /**
   * Syncs media & stories across all active connected social accounts.
   */
  async syncAllAccountsMedia(options?: {
    platform?: SocialPlatform
    includeStories?: boolean
  }): Promise<{
    accounts_synced: number
    total_posts: number
    total_stories: number
    errors: Array<{ account_id: string; error: string }>
  }> {
    const filters: Record<string, unknown> = { status: "active" }
    if (options?.platform) {
      filters.platform = options.platform
    }

    const accounts = await this.repoListAccounts(filters)
    let accountsSynced = 0
    let totalPosts = 0
    let totalStories = 0
    const errors: Array<{ account_id: string; error: string }> = []

    for (const acc of accounts) {
      if (acc.platform === "local") continue
      try {
        const res = await this.syncAccountMedia(acc.id, {
          includeStories: options?.includeStories,
        })
        accountsSynced += 1
        totalPosts += res.synced_posts
        totalStories += res.synced_stories
      } catch (err) {
        errors.push({
          account_id: acc.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return {
      accounts_synced: accountsSynced,
      total_posts: totalPosts,
      total_stories: totalStories,
      errors,
    }
  }

  /**
   * Creates a manual on-site ephemeral story (`platform: "local"`, `media_type: "story"`),
   * providing a full superset of `@bambiste/medusa-stories` with optional product hotspot tags.
   */
  async publishLocalStory(
    input: CreateLocalStoryInput
  ): Promise<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }> {
    const safeMediaUrl = sanitizeHttpUrl(input.media_url)
    if (!safeMediaUrl) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A valid http/https media_url is required to create a story."
      )
    }

    const safeThumb = input.thumbnail_url ? sanitizeHttpUrl(input.thumbnail_url) : null
    const safeCtaUrl = input.cta_url ? sanitizeHttpUrl(input.cta_url) : null
    const safeAvatarUrl = input.author_avatar_url
      ? sanitizeHttpUrl(input.author_avatar_url)
      : null

    let expiresAt: Date | null = null
    if (input.expires_at !== undefined) {
      expiresAt = input.expires_at ? new Date(input.expires_at) : null
    } else {
      // Default 24h ephemeral story window if not explicitly set to null
      expiresAt = new Date(Date.now() + 24 * 3600 * 1000)
    }

    const post = await this.repoCreatePost({
      social_account_id: null,
      platform: "local",
      platform_post_id: `local_story_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
      media_type: "story",
      caption: input.caption ?? null,
      media_url: safeMediaUrl,
      thumbnail_url: safeThumb,
      permalink: null,
      duration: input.duration ?? 5,
      view_count: 0,
      like_count: 0,
      comment_count: 0,
      share_count: 0,
      published_at: new Date(),
      expires_at: expiresAt,
      is_shoppable: Boolean(input.product_tags && input.product_tags.length > 0),
      is_featured: Boolean(input.is_featured),
      sort_order: typeof input.sort_order === "number" ? input.sort_order : 0,
      author_name: input.author_name?.trim() || "Store Highlights",
      author_avatar_url: safeAvatarUrl,
      cta_text: input.cta_text?.trim() || null,
      cta_url: safeCtaUrl,
      status: input.status ?? "active",
      metadata: input.metadata ?? null,
    })

    let taggedProducts: SocialProductTagRecord[] = []
    if (Array.isArray(input.product_tags) && input.product_tags.length > 0) {
      taggedProducts = await this.tagProductsOnPost(post.id, input.product_tags, true)
    }

    const refreshed = (await this.repoRetrievePost(post.id)) ?? post
    return {
      ...refreshed,
      tagged_products: taggedProducts,
    }
  }

  async createLocalStory(
    input: CreateLocalStoryInput
  ): Promise<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }> {
    return this.publishLocalStory(input)
  }

  /**
   * Lists unified media posts (videos, reels, stories, images, carousels) with tagged products.
   */
  async listMediaPosts(filters?: {
    platform?: SocialPlatform
    media_type?: MediaType
    status?: PostStatus
    is_shoppable?: boolean
    is_featured?: boolean
    include_expired?: boolean
    limit?: number
    offset?: number
  }): Promise<{
    posts: Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
    count: number
  }> {
    const queryFilters: Record<string, unknown> = {}
    if (filters?.platform) queryFilters.platform = filters.platform
    if (filters?.media_type) queryFilters.media_type = filters.media_type
    if (filters?.status) queryFilters.status = filters.status
    if (filters?.is_shoppable !== undefined) {
      queryFilters.is_shoppable = filters.is_shoppable
    }
    if (filters?.is_featured !== undefined) {
      queryFilters.is_featured = filters.is_featured
    }

    const allPosts = await this.repoListPosts(queryFilters)
    const nowMs = Date.now()

    const filtered = allPosts.filter((p) => {
      if (!filters?.include_expired && p.expires_at) {
        const exp = new Date(p.expires_at).getTime()
        if (exp <= nowMs) return false
      }
      return true
    })

    filtered.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
      return timeB - timeA
    })

    const offset = Math.max(0, filters?.offset ?? 0)
    const limit = Math.max(1, Math.min(100, filters?.limit ?? 24))
    const page = filtered.slice(offset, offset + limit)

    const enriched = await Promise.all(
      page.map(async (post) => {
        const tags = await this.repoListTags({ social_media_post_id: post.id })
        return {
          ...post,
          tagged_products: tags,
        }
      })
    )

    return {
      posts: enriched,
      count: filtered.length,
    }
  }

  /**
   * Lists currently active, non-expired stories (`media_type === "story"`, `status === "active"`)
   * across Instagram, Facebook, TikTok, and local Admin stories.
   */
  async listActiveStories(
    filters?: {
      platform?: SocialPlatform
      is_featured?: boolean
      limit?: number
    },
    nowMs: number = Date.now()
  ): Promise<
    Array<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }>
  > {
    const queryFilters: Record<string, unknown> = {
      media_type: "story",
      status: "active",
    }
    if (filters?.platform) queryFilters.platform = filters.platform
    if (filters?.is_featured !== undefined) {
      queryFilters.is_featured = filters.is_featured
    }

    const stories = await this.repoListPosts(queryFilters)
    const active = stories.filter((s) => {
      if (!s.expires_at) return true
      return new Date(s.expires_at).getTime() > nowMs
    })

    active.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order
      }
      const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
      const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
      return timeB - timeA
    })

    const limit = filters?.limit ? Math.max(1, Math.min(100, filters.limit)) : 50
    const sliced = active.slice(0, limit)

    return Promise.all(
      sliced.map(async (story) => {
        const tags = await this.repoListTags({ social_media_post_id: story.id })
        return {
          ...story,
          tagged_products: tags,
        }
      })
    )
  }

  /**
   * Retrieves a single `SocialMediaPost` with its tagged products.
   */
  async getMediaPostWithTags(
    postId: string
  ): Promise<SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }> {
    const post = await this.repoRetrievePost(postId)
    if (!post) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }
    const tags = await this.repoListTags({ social_media_post_id: post.id })
    return {
      ...post,
      tagged_products: tags,
    }
  }

  /**
   * Updates a `SocialMediaPost` or local story (`caption`, `status`, `is_featured`, `sort_order`, `expires_at`, etc.).
   */
  async modifyMediaPost(
    postId: string,
    patch: Partial<
      Pick<
        SocialMediaPostRecord,
        | "caption"
        | "media_url"
        | "thumbnail_url"
        | "status"
        | "is_featured"
        | "sort_order"
        | "expires_at"
        | "author_name"
        | "author_avatar_url"
        | "cta_text"
        | "cta_url"
        | "metadata"
      >
    >
  ): Promise<SocialMediaPostRecord> {
    const existing = await this.repoRetrievePost(postId)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }
    return this.repoUpdatePost(postId, patch)
  }

  async updateMediaPost(
    postId: string,
    patch: Parameters<SocialCommerceService["modifyMediaPost"]>[1]
  ): Promise<SocialMediaPostRecord> {
    return this.modifyMediaPost(postId, patch)
  }

  /**
   * Deletes a `SocialMediaPost` and its associated `SocialProductTag` rows.
   */
  async purgeMediaPost(postId: string): Promise<{ id: string; deleted: boolean }> {
    const existing = await this.repoRetrievePost(postId)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }

    const tags = await this.repoListTags({ social_media_post_id: postId })
    for (const tag of tags) {
      await this.repoDeleteTag(tag.id)
    }
    await this.repoDeletePost(postId)
    return { id: postId, deleted: true }
  }

  async deleteMediaPost(postId: string): Promise<{ id: string; deleted: boolean }> {
    return this.purgeMediaPost(postId)
  }

  // ===========================================================================
  // 3. Product & Variant Tagging (Video Timestamps + Image/Story Hotspots)
  // ===========================================================================

  /**
   * Tags Medusa products/variants onto a `SocialMediaPost` with optional video
   * timestamps (`timestamp_seconds`) or image/story coordinates (`position_x`, `position_y`).
   */
  async tagProductsOnPost(
    postId: string,
    tags: TagProductInput[],
    replaceExisting: boolean = false
  ): Promise<SocialProductTagRecord[]> {
    const post = await this.repoRetrievePost(postId)
    if (!post) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${postId}" was not found.`
      )
    }

    if (!Array.isArray(tags)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "tags must be an array of product tag definitions."
      )
    }

    for (const tag of tags) {
      if (!tag.product_id?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Each product tag requires a non-empty product_id."
        )
      }
      if (
        tag.timestamp_seconds !== undefined &&
        tag.timestamp_seconds !== null &&
        (!Number.isFinite(tag.timestamp_seconds) || tag.timestamp_seconds < 0)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "timestamp_seconds must be a non-negative number."
        )
      }
      if (
        tag.position_x !== undefined &&
        tag.position_x !== null &&
        (!Number.isFinite(tag.position_x) || tag.position_x < 0 || tag.position_x > 100)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "position_x must be a percentage between 0 and 100."
        )
      }
      if (
        tag.position_y !== undefined &&
        tag.position_y !== null &&
        (!Number.isFinite(tag.position_y) || tag.position_y < 0 || tag.position_y > 100)
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "position_y must be a percentage between 0 and 100."
        )
      }
    }

    if (replaceExisting) {
      const existingTags = await this.repoListTags({ social_media_post_id: postId })
      for (const existing of existingTags) {
        await this.repoDeleteTag(existing.id)
      }
    }

    for (const tag of tags) {
      await this.repoCreateTag({
        social_media_post_id: postId,
        product_id: tag.product_id.trim(),
        variant_id: tag.variant_id?.trim() || null,
        timestamp_seconds:
          typeof tag.timestamp_seconds === "number" ? tag.timestamp_seconds : null,
        position_x: typeof tag.position_x === "number" ? tag.position_x : null,
        position_y: typeof tag.position_y === "number" ? tag.position_y : null,
        label: tag.label?.trim() || null,
        is_featured: Boolean(tag.is_featured),
      })
    }

    const allTags = await this.repoListTags({ social_media_post_id: postId })
    await this.repoUpdatePost(postId, {
      is_shoppable: allTags.length > 0,
    })

    return allTags
  }

  /**
   * Lists all posts and stories where a given Medusa `product_id` is tagged.
   */
  async listPostsForProduct(productId: string): Promise<
    Array<{
      post: SocialMediaPostRecord
      tag: SocialProductTagRecord
    }>
  > {
    if (!productId?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required."
      )
    }
    const tags = await this.repoListTags({ product_id: productId.trim() })
    const results: Array<{ post: SocialMediaPostRecord; tag: SocialProductTagRecord }> = []

    for (const tag of tags) {
      const post = await this.repoRetrievePost(tag.social_media_post_id)
      if (post) {
        results.push({ post, tag })
      }
    }
    return results
  }

  // ===========================================================================
  // 4. Live Shopping Sessions & Flash-Sale Stock Reservations
  // ===========================================================================

  /**
   * Creates a scheduled or active Live Shopping session.
   */
  async scheduleLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionRecord> {
    if (!input.social_account_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "social_account_id is required to create a live session."
      )
    }
    if (!input.title?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "title is required to create a live session."
      )
    }

    const account = await this.repoRetrieveAccount(input.social_account_id)
    if (!account) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialAccount "${input.social_account_id}" was not found.`
      )
    }

    return this.repoCreateLiveSession({
      social_account_id: account.id,
      platform: input.platform ?? account.platform,
      platform_live_id: input.platform_live_id ?? null,
      title: input.title.trim(),
      description: input.description ?? null,
      stream_url: input.stream_url ? sanitizeHttpUrl(input.stream_url) : null,
      playback_url: input.playback_url ? sanitizeHttpUrl(input.playback_url) : null,
      status: "scheduled",
      scheduled_at: input.scheduled_at ? new Date(input.scheduled_at) : null,
      started_at: null,
      ended_at: null,
      viewer_count: 0,
      peak_viewer_count: 0,
      metadata: input.metadata ?? null,
    })
  }

  async createLiveSession(input: CreateLiveSessionInput): Promise<LiveSessionRecord> {
    return this.scheduleLiveSession(input)
  }

  /**
   * Attaches or updates products in a live session and initializes flash-sale stock
   * if the session is currently `live`.
   */
  async pinProductsToLiveSession(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<LiveProductRecord[]> {
    const session = await this.repoRetrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }
    if (!Array.isArray(products) || products.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one product must be provided to attach to a live session."
      )
    }

    const existingProducts = await this.repoListLiveProducts({
      live_session_id: sessionId,
    })
    const results: LiveProductRecord[] = []

    for (const item of products) {
      if (!item.product_id?.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Each live product requires a non-empty product_id."
        )
      }

      const variantId = item.variant_id?.trim() || item.product_id.trim()
      const match = existingProducts.find(
        (p) =>
          p.product_id === item.product_id.trim() &&
          (p.variant_id || p.product_id) === variantId
      )

      let record: LiveProductRecord
      if (match) {
        record = await this.repoUpdateLiveProduct(match.id, {
          variant_id: item.variant_id?.trim() || null,
          live_price: item.live_price ?? match.live_price,
          currency_code: item.currency_code ?? match.currency_code,
          live_stock:
            item.live_stock !== undefined ? item.live_stock : match.live_stock,
          sort_order: item.sort_order ?? match.sort_order,
          pinned_at: item.is_pinned ? new Date() : match.pinned_at,
          metadata: item.metadata ?? match.metadata,
        })
      } else {
        record = await this.repoCreateLiveProduct({
          live_session_id: sessionId,
          product_id: item.product_id.trim(),
          variant_id: item.variant_id?.trim() || null,
          live_price: item.live_price ?? null,
          currency_code: item.currency_code ?? null,
          live_stock: item.live_stock ?? null,
          reserved_quantity: 0,
          sold_quantity: 0,
          pinned_at: item.is_pinned ? new Date() : null,
          sort_order: item.sort_order ?? 0,
          metadata: item.metadata ?? null,
        })
      }

      if (session.status === "live" && typeof record.live_stock === "number") {
        await this.reservationService.initializeLiveStock(
          sessionId,
          record.variant_id || record.product_id,
          record.live_stock
        )
      }

      results.push(record)
    }

    return results
  }

  async attachProductsToLiveSession(
    sessionId: string,
    products: AttachLiveProductInput[]
  ): Promise<LiveProductRecord[]> {
    return this.pinProductsToLiveSession(sessionId, products)
  }

  /**
   * Transitions a live session to `live` status and initializes atomic stock pools
   * for all attached `LiveProduct` items.
   */
  async startLiveSession(
    sessionId: string,
    options?: { stream_url?: string; platform_live_id?: string }
  ): Promise<LiveSessionRecord> {
    const session = await this.repoRetrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }

    const updated = await this.repoUpdateLiveSession(sessionId, {
      status: "live",
      started_at: session.started_at ?? new Date(),
      stream_url: options?.stream_url
        ? sanitizeHttpUrl(options.stream_url)
        : session.stream_url,
      platform_live_id: options?.platform_live_id ?? session.platform_live_id,
    })

    const liveProducts = await this.repoListLiveProducts({
      live_session_id: sessionId,
    })
    for (const lp of liveProducts) {
      if (typeof lp.live_stock === "number" && lp.live_stock >= 0) {
        await this.reservationService.initializeLiveStock(
          sessionId,
          lp.variant_id || lp.product_id,
          lp.live_stock
        )
      }
    }

    return updated
  }

  /**
   * Ends a live session and releases all unconfirmed held reservations back to the pool.
   */
  async endLiveSession(
    sessionId: string
  ): Promise<{ session: LiveSessionRecord; released_reservations: number }> {
    const session = await this.repoRetrieveLiveSession(sessionId)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${sessionId}" was not found.`
      )
    }

    const releasedCount =
      await this.reservationService.releaseSessionReservations(sessionId)

    const updated = await this.repoUpdateLiveSession(sessionId, {
      status: "ended",
      ended_at: new Date(),
    })

    return {
      session: updated,
      released_reservations: releasedCount,
    }
  }

  /**
   * Lists live sessions with their attached products and real-time stock availability.
   */
  async listLiveSessionsWithStock(filters?: {
    platform?: SocialPlatform
    status?: LiveSessionStatus
    social_account_id?: string
  }): Promise<
    Array<
      LiveSessionRecord & {
        products: Array<
          LiveProductRecord & {
            stock_availability: { total: number; reserved: number; available: number }
          }
        >
      }
    >
  > {
    const sessions = await this.repoListLiveSessions(
      filters as Record<string, unknown> | undefined
    )

    return Promise.all(
      sessions.map(async (session) => {
        const products = await this.repoListLiveProducts({
          live_session_id: session.id,
        })
        products.sort((a, b) => a.sort_order - b.sort_order)

        const enrichedProducts = await Promise.all(
          products.map(async (p) => {
            const keyVariantId = p.variant_id || p.product_id
            const availability =
              session.status === "live" && typeof p.live_stock === "number"
                ? await this.reservationService.getAvailableStock(
                    session.id,
                    keyVariantId
                  )
                : {
                    total: p.live_stock ?? 0,
                    reserved: p.reserved_quantity,
                    available: Math.max(0, (p.live_stock ?? 0) - p.reserved_quantity),
                  }
            return {
              ...p,
              stock_availability: availability,
            }
          })
        )

        return {
          ...session,
          products: enrichedProducts,
        }
      })
    )
  }

  /**
   * Reserves flash-sale stock during an active live session.
   */
  async reserveLiveProductStock(
    input: ReserveLiveStockInput,
    nowMs: number = Date.now()
  ): Promise<ReservationRecord> {
    const session = await this.repoRetrieveLiveSession(input.session_id)
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `LiveSession "${input.session_id}" was not found.`
      )
    }
    if (session.status !== "live") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cannot reserve stock because LiveSession "${input.session_id}" is currently "${session.status}".`
      )
    }

    const reservation = await this.reservationService.reserveStock(input, nowMs)

    const liveProducts = await this.repoListLiveProducts({
      live_session_id: input.session_id,
      product_id: input.product_id,
    })
    const matching = liveProducts.find(
      (lp) => (lp.variant_id || lp.product_id) === input.variant_id
    )
    if (matching) {
      const stockInfo = await this.reservationService.getAvailableStock(
        input.session_id,
        input.variant_id,
        nowMs
      )
      await this.repoUpdateLiveProduct(matching.id, {
        reserved_quantity: stockInfo.reserved,
      })
    }

    return reservation
  }

  /**
   * Confirms a held live reservation when an order is placed (`order.placed` subscriber).
   */
  async confirmLiveProductReservation(reservationId: string): Promise<{
    confirmed: boolean
    quantity: number
    reservation: ReservationRecord | null
  }> {
    const result = await this.reservationService.confirmReservation(reservationId)
    if (result.confirmed && result.reservation) {
      const liveProducts = await this.repoListLiveProducts({
        live_session_id: result.reservation.session_id,
        product_id: result.reservation.product_id,
      })
      const matching = liveProducts.find(
        (lp) =>
          (lp.variant_id || lp.product_id) === result.reservation?.variant_id
      )
      if (matching) {
        const stockInfo = await this.reservationService.getAvailableStock(
          result.reservation.session_id,
          result.reservation.variant_id
        )
        await this.repoUpdateLiveProduct(matching.id, {
          reserved_quantity: stockInfo.reserved,
          sold_quantity: matching.sold_quantity + result.quantity,
        })
      }
    }
    return result
  }

  // ===========================================================================
  // 5. Outbound Product Catalog Sync & Social Checkout Handoff
  // ===========================================================================

  /**
   * Pushes a batch of Medusa products/variants to a connected Meta Catalog or TikTok Shop
   * and records per-item sync state in `CatalogSyncItem`.
   */
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

    const { account, accessToken } = await this.getDecryptedAccountWithToken(accountId)
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
      const existing = await this.repoListCatalogItems({
        social_account_id: account.id,
        variant_id: item.id,
      })

      const errMsg = errorMap.get(item.id) ?? null
      const syncStatus = errMsg ? "failed" : "synced"

      if (existing.length > 0) {
        await this.repoUpdateCatalogItem(existing[0].id, {
          external_catalog_id: externalCatalogId,
          external_product_id: item.id,
          sync_status: syncStatus,
          last_synced_at: now,
          error_message: errMsg,
        })
      } else {
        await this.repoCreateCatalogItem({
          social_account_id: account.id,
          platform: account.platform,
          product_id: item.item_group_id,
          variant_id: item.id,
          external_catalog_id: externalCatalogId,
          external_product_id: item.id,
          sync_status: syncStatus,
          content_hash: null,
          last_synced_at: now,
          error_message: errMsg,
          metadata: null,
        })
      }
    }

    return batchResult
  }

  /**
   * Lists `CatalogSyncItem` records with optional filtering by `platform`, `social_account_id`, or `sync_status`.
   */
  async listCatalogItems(filters?: {
    social_account_id?: string
    platform?: SocialPlatform
    sync_status?: "pending" | "synced" | "failed"
    product_id?: string
  }): Promise<CatalogSyncItemRecord[]> {
    return this.repoListCatalogItems(filters as Record<string, unknown> | undefined)
  }

  /**
   * Returns true if a secret `feed_token` is configured in module options or environment variables.
   */
  isFeedTokenRequired(): boolean {
    const expected =
      this.moduleOptions.feed_token ||
      process.env.SOCIAL_COMMERCE_FEED_TOKEN ||
      process.env.SC_FEED_TOKEN
    return Boolean(expected && expected.trim().length > 0)
  }

  /**
   * Verifies the provided catalog feed token in constant time if `feed_token` is configured.
   * Throws `MedusaError(UNAUTHORIZED)` when a required token is missing or invalid.
   */
  verifyCatalogFeedToken(providedToken?: string | null): boolean {
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

  /**
   * Maps raw Medusa v2 product & variant records into `CatalogFeedProductItem[]`.
   */
  mapMedusaProductsToFeedItems(
    products: Array<Record<string, unknown>>,
    options?: MapMedusaProductsOptions
  ): CatalogFeedProductItem[] {
    return this.catalogFeedService.mapMedusaProductsToFeedItems(products, options)
  }

  /**
   * Generates an XML (Meta/Google RSS 2.0 `g:*`), CSV (TikTok Shop), or JSON catalog feed.
   */
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

  /**
   * Validates a Social Checkout Handoff request (including optional live reservation lock)
   * and returns the pre-filled checkout redirect URL and line items.
   */
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
  // 6. Webhook Signature Verification & Dispatch
  // ===========================================================================

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
}
