export type ExternalSocialPlatform = "tiktok" | "instagram" | "facebook"
export type SocialPlatform = ExternalSocialPlatform | "local"

export type SocialMediaType = "video" | "reel" | "story" | "image" | "carousel"
export type MediaType = SocialMediaType

export type SocialMediaStatus = "active" | "expired" | "deleted" | "private" | "archived" | "hidden"
export type PostStatus = SocialMediaStatus

export type SocialAccountStatus = "active" | "expired" | "revoked" | "error" | "disconnected"
export type LiveSessionStatus = "scheduled" | "live" | "ended" | "cancelled"
export type CatalogSyncStatus = "synced" | "pending" | "failed"
export type CatalogFeedFormat = "xml" | "csv" | "json" | "meta_xml" | "tiktok_csv"
export type ReservationStatus = "held" | "confirmed" | "released" | "expired"

export interface CatalogFeedItemContext {
  currency_code: string
  country_code?: string
  region_id?: string
  sales_channel_id?: string
  raw_product?: Record<string, unknown>
  raw_variant?: Record<string, unknown>
}

export type BeforeCatalogFeedItemHook = (
  item: CatalogFeedProductItem,
  context: CatalogFeedItemContext
) => CatalogFeedProductItem | null | undefined | false

export interface SocialCommerceModuleOptions {
  /**
   * 64-character hex string (32 bytes) or passphrase for AES-256-GCM token encryption at rest.
   */
  encryption_key?: string
  state_secret?: string
  storefront_url?: string
  default_brand_name?: string
  default_currency?: string
  /**
   * Optional secret token to protect `GET /store/social/catalog-feed` via `x-feed-token` header or `?token=` query param.
   */
  feed_token?: string
  /**
   * Optional hook invoked for each catalog feed item before rendering.
   * Return a modified item, or return `null` / `false` to exclude the variant from the feed.
   */
  before_feed_item?: BeforeCatalogFeedItemHook
  reservation_ttl_seconds?: number
  lock_ttl_seconds?: number
  redis_url?: string
  tiktok?: {
    client_key?: string
    client_secret?: string
    redirect_uri?: string
    shop_id?: string
    webhook_secret?: string
  }
  meta?: {
    app_id?: string
    app_secret?: string
    redirect_uri?: string
    graph_api_version?: string
    catalog_id?: string
    webhook_secret?: string
    webhook_verify_token?: string
  }
}

export type SocialCommercePluginOptions = SocialCommerceModuleOptions

export interface SocialAccountRecord {
  id: string
  platform: SocialPlatform
  platform_user_id: string
  platform_username: string
  display_name: string | null
  avatar_url: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: Date | string | null
  scopes: string[] | null
  external_catalog_id: string | null
  external_shop_id: string | null
  status: SocialAccountStatus
  last_synced_at: Date | string | null
  metadata: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export type SocialAccountPublicDTO = Omit<
  SocialAccountRecord,
  "access_token" | "refresh_token"
>

export interface SocialMediaMetrics {
  like_count?: number
  comment_count?: number
  share_count?: number
  view_count?: number
  reach_count?: number
  saved_count?: number
}

export interface SocialProductTagRecord {
  id: string
  social_media_post_id: string
  product_id: string
  variant_id: string | null
  timestamp_seconds: number | null
  position_x: number | null
  position_y: number | null
  label: string | null
  is_featured: boolean
  created_at?: Date | string
  updated_at?: Date | string
}

export interface SocialMediaPostRecord {
  id: string
  social_account_id: string | null
  platform: SocialPlatform
  platform_post_id: string
  media_type: MediaType
  caption: string | null
  media_url: string
  thumbnail_url: string | null
  permalink: string | null
  duration: number | null
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  published_at: Date | string | null
  expires_at: Date | string | null
  is_shoppable: boolean
  is_featured: boolean
  sort_order: number
  author_name: string | null
  author_avatar_url: string | null
  cta_text: string | null
  cta_url: string | null
  status: PostStatus
  metadata: Record<string, unknown> | null
  tagged_products?: SocialProductTagRecord[]
  created_at?: Date | string
  updated_at?: Date | string
}

export interface LiveProductRecord {
  id: string
  live_session_id: string
  product_id: string
  variant_id: string | null
  live_price: number | null
  currency_code: string | null
  live_stock: number | null
  reserved_quantity: number
  sold_quantity: number
  pinned_at: Date | string | null
  sort_order: number
  metadata: Record<string, unknown> | null
  stock_availability?: StockAvailabilityInfo
  created_at?: Date | string
  updated_at?: Date | string
}

export interface LiveSessionRecord {
  id: string
  social_account_id: string
  platform: SocialPlatform
  platform_live_id: string | null
  title: string
  description: string | null
  stream_url: string | null
  playback_url: string | null
  status: LiveSessionStatus
  scheduled_at: Date | string | null
  started_at: Date | string | null
  ended_at: Date | string | null
  viewer_count: number
  peak_viewer_count: number
  metadata: Record<string, unknown> | null
  products?: LiveProductRecord[]
  created_at?: Date | string
  updated_at?: Date | string
}

export interface CatalogSyncItemRecord {
  id: string
  social_account_id: string
  platform: SocialPlatform
  product_id: string
  variant_id: string
  external_catalog_id: string
  external_product_id: string | null
  sync_status: CatalogSyncStatus
  content_hash: string | null
  last_synced_at: Date | string | null
  error_message: string | null
  metadata: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

// ============================================================================
// Service Input & Output DTOs
// ============================================================================

export interface TagProductInput {
  product_id: string
  variant_id?: string | null
  timestamp_seconds?: number | null
  position_x?: number | null
  position_y?: number | null
  label?: string | null
  is_featured?: boolean
}

export interface CreateLocalStoryInput {
  caption?: string | null
  media_url: string
  thumbnail_url?: string | null
  duration?: number | null
  expires_at?: Date | string | null
  is_featured?: boolean
  sort_order?: number
  author_name?: string | null
  author_avatar_url?: string | null
  cta_text?: string | null
  cta_url?: string | null
  status?: PostStatus
  product_tags?: TagProductInput[]
  metadata?: Record<string, unknown> | null
}

export interface CreateLiveSessionInput {
  social_account_id: string
  platform?: SocialPlatform
  platform_live_id?: string | null
  title: string
  description?: string | null
  stream_url?: string | null
  playback_url?: string | null
  scheduled_at?: Date | string | null
  metadata?: Record<string, unknown> | null
}

export interface AttachLiveProductInput {
  product_id: string
  variant_id?: string | null
  live_price?: number | null
  currency_code?: string | null
  live_stock?: number | null
  sort_order?: number
  is_pinned?: boolean
  metadata?: Record<string, unknown> | null
}

export interface StockAvailabilityInfo {
  total: number
  reserved: number
  available: number
}

export interface ReserveLiveStockInput {
  session_id: string
  product_id: string
  variant_id: string
  quantity: number
  customer_id?: string | null
  cart_id?: string | null
  ttl_seconds?: number
}

export interface ReservationRecord {
  id: string
  session_id: string
  product_id: string
  variant_id: string
  quantity: number
  customer_id: string | null
  cart_id: string | null
  status: ReservationStatus
  expires_at: number
  created_at: number
}

export interface CatalogFeedProductItem {
  id: string
  item_group_id: string
  title: string
  description: string
  link: string
  image_link: string
  additional_image_links?: string[]
  price: number
  sale_price?: number | null
  currency_code: string
  availability?: "in stock" | "out of stock" | "preorder" | "backorder"
  condition?: "new" | "refurbished" | "used"
  brand?: string
  inventory_quantity?: number
  google_product_category?: string
  product_type?: string
  gtin?: string
  mpn?: string
  color?: string
  size?: string
  material?: string
  gender?: "male" | "female" | "unisex"
  age_group?: "newborn" | "infant" | "toddler" | "kids" | "adult"
  custom_options?: Record<string, string>
}

export type CatalogProductInput = CatalogFeedProductItem

export interface CatalogSyncBatchResult {
  platform: SocialPlatform
  external_catalog_id: string
  synced_count: number
  failed_count: number
  errors: Array<{
    variant_id: string
    message: string
  }>
}

export type CatalogBatchSyncResult = CatalogSyncBatchResult

export interface CheckoutHandoffLineItem {
  variant_id: string
  quantity: number
}

export interface CheckoutHandoffInput {
  products_param?: string
  items?: CheckoutHandoffLineItem[]
  coupon?: string
  source_platform?: SocialPlatform
  source_post_id?: string
  live_session_id?: string
  reservation_id?: string
  redirect?: boolean | string
}

export interface CheckoutHandoffResult {
  cart_id: string | null
  items: CheckoutHandoffLineItem[]
  coupon: string | null
  reservation_id: string | null
  checkout_url: string
  attribution: {
    source_platform: SocialPlatform | null
    source_post_id: string | null
    live_session_id: string | null
  }
}

// ============================================================================
// Provider Adapter Contracts
// ============================================================================

export interface ProviderOAuthTokenResult {
  access_token: string
  refresh_token: string | null
  expires_in: number | null
  scopes: string[]
  platform_user_id: string
  platform_username: string
  display_name?: string | null
  avatar_url?: string | null
  external_catalog_id?: string | null
  external_shop_id?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ProviderFetchedPost {
  platform_post_id: string
  media_type: MediaType
  caption: string | null
  media_url: string
  thumbnail_url: string | null
  permalink: string | null
  duration: number | null
  view_count: number
  like_count: number
  comment_count: number
  share_count: number
  published_at: Date | null
  expires_at: Date | null
  author_name?: string | null
  author_avatar_url?: string | null
  metadata: Record<string, unknown> | null
}

export interface SocialPlatformProvider {
  readonly platform: SocialPlatform
  getAuthUrl(options: {
    state: string
    codeChallenge?: string
    redirectUri?: string
    scopes?: string[]
  }): string
  exchangeCodeForToken(options: {
    code: string
    codeVerifier?: string
    redirectUri?: string
  }): Promise<ProviderOAuthTokenResult>
  refreshAccessToken(refreshTokenOrAccessToken: string): Promise<{
    access_token: string
    refresh_token: string | null
    expires_in: number | null
  }>
  fetchMediaPosts(
    accessToken: string,
    options?: {
      limit?: number
      cursor?: string
      platformUserId?: string
    }
  ): Promise<{
    posts: ProviderFetchedPost[]
    nextCursor: string | null
  }>
  fetchStories?(
    accessToken: string,
    options?: {
      platformUserId?: string
    }
  ): Promise<ProviderFetchedPost[]>
  syncCatalogBatch?(
    accessToken: string,
    options: {
      externalCatalogId: string
      items: CatalogFeedProductItem[]
    }
  ): Promise<CatalogSyncBatchResult>
}
