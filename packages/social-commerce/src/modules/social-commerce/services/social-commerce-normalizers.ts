import type {
  CatalogSyncItemRecord,
  LiveProductRecord,
  LiveSessionRecord,
  SocialAccountPublicDTO,
  SocialAccountRecord,
  SocialAccountStatus,
  SocialMediaPostRecord,
  SocialProductTagRecord,
} from "../types/index"

type RawRecord<T extends { id: string }> = Partial<T> & { id: string }

export function matchesFilter<T extends Record<string, unknown>>(
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

export function normalizeAccountRecord(
  raw: RawRecord<SocialAccountRecord>
): SocialAccountRecord {
  const platformUserId = raw.platform_user_id ?? raw.external_id ?? ""
  const platformUsername = raw.platform_username ?? raw.username ?? ""
  const accessToken = raw.access_token ?? raw.encrypted_access_token ?? ""
  const refreshToken = raw.refresh_token ?? raw.encrypted_refresh_token ?? null
  const status: SocialAccountStatus =
    raw.status ?? (raw.is_active === false ? "disconnected" : "active")
  const isActive =
    raw.is_active !== undefined ? Boolean(raw.is_active) : status === "active"

  return {
    ...raw,
    platform: raw.platform ?? "tiktok",
    platform_user_id: platformUserId,
    external_id: raw.external_id ?? platformUserId,
    platform_username: platformUsername,
    username: raw.username ?? platformUsername,
    display_name: raw.display_name ?? null,
    avatar_url: raw.avatar_url ?? null,
    access_token: accessToken,
    encrypted_access_token: raw.encrypted_access_token ?? accessToken,
    refresh_token: refreshToken,
    encrypted_refresh_token: raw.encrypted_refresh_token ?? refreshToken,
    token_expires_at: raw.token_expires_at ?? null,
    scopes: raw.scopes ?? null,
    external_catalog_id: raw.external_catalog_id ?? null,
    external_shop_id: raw.external_shop_id ?? null,
    status,
    is_active: isActive,
    last_synced_at: raw.last_synced_at ?? null,
    metadata: raw.metadata ?? null,
  }
}

export function toPublicAccountDTO(
  account: SocialAccountRecord
): SocialAccountPublicDTO {
  const normalized = normalizeAccountRecord(account)
  const {
    access_token: _at,
    refresh_token: _rt,
    encrypted_access_token: _eat,
    encrypted_refresh_token: _ert,
    ...safe
  } = normalized
  return safe
}

export function normalizePostRecord(
  raw: RawRecord<SocialMediaPostRecord>
): SocialMediaPostRecord {
  const socialAccountId = raw.social_account_id ?? raw.account_id ?? null
  const platformPostId = raw.platform_post_id ?? raw.external_id ?? ""
  const viewCount = raw.view_count ?? raw.views_count ?? 0
  const likeCount = raw.like_count ?? raw.likes_count ?? 0
  const commentCount = raw.comment_count ?? raw.comments_count ?? 0
  const shareCount = raw.share_count ?? raw.shares_count ?? 0

  return {
    ...raw,
    social_account_id: socialAccountId,
    account_id: raw.account_id ?? socialAccountId,
    platform: raw.platform ?? "tiktok",
    platform_post_id: platformPostId,
    external_id: raw.external_id ?? platformPostId,
    media_type: raw.media_type ?? "video",
    caption: raw.caption ?? null,
    media_url: raw.media_url ?? "",
    thumbnail_url: raw.thumbnail_url ?? null,
    permalink: raw.permalink ?? null,
    duration: raw.duration ?? null,
    view_count: viewCount,
    views_count: raw.views_count ?? viewCount,
    like_count: likeCount,
    likes_count: raw.likes_count ?? likeCount,
    comment_count: commentCount,
    comments_count: raw.comments_count ?? commentCount,
    share_count: shareCount,
    shares_count: raw.shares_count ?? shareCount,
    published_at: raw.published_at ?? null,
    expires_at: raw.expires_at ?? null,
    is_shoppable: Boolean(raw.is_shoppable),
    is_featured: Boolean(raw.is_featured),
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    author_name: raw.author_name ?? null,
    author_avatar_url: raw.author_avatar_url ?? null,
    cta_text: raw.cta_text ?? null,
    cta_url: raw.cta_url ?? null,
    status: raw.status ?? "active",
    synced_at: raw.synced_at ?? raw.updated_at ?? null,
    metadata: raw.metadata ?? null,
  }
}

export function normalizeTagRecord(
  raw: RawRecord<SocialProductTagRecord>
): SocialProductTagRecord {
  const postId = raw.social_media_post_id ?? raw.post_id ?? ""
  const timestampSeconds = raw.timestamp_seconds ?? raw.video_timestamp ?? null
  const posX = raw.position_x ?? raw.coordinates?.x ?? null
  const posY = raw.position_y ?? raw.coordinates?.y ?? null
  const coordinates =
    raw.coordinates ??
    (typeof posX === "number" && typeof posY === "number"
      ? { x: posX, y: posY }
      : null)

  return {
    ...raw,
    social_media_post_id: postId,
    post_id: raw.post_id ?? postId,
    product_id: raw.product_id ?? "",
    variant_id: raw.variant_id ?? null,
    timestamp_seconds: timestampSeconds,
    video_timestamp: raw.video_timestamp ?? timestampSeconds,
    position_x: posX,
    position_y: posY,
    coordinates,
    label: raw.label ?? null,
    is_featured: Boolean(raw.is_featured),
    metadata: raw.metadata ?? null,
  }
}

export function normalizeLiveSessionRecord(
  raw: RawRecord<LiveSessionRecord>
): LiveSessionRecord {
  const socialAccountId = raw.social_account_id ?? raw.account_id ?? ""
  const platformLiveId = raw.platform_live_id ?? raw.external_id ?? null

  return {
    ...raw,
    social_account_id: socialAccountId,
    account_id: raw.account_id ?? socialAccountId,
    platform: raw.platform ?? "tiktok",
    platform_live_id: platformLiveId,
    external_id: raw.external_id ?? platformLiveId,
    title: raw.title ?? "",
    description: raw.description ?? null,
    stream_url: raw.stream_url ?? null,
    playback_url: raw.playback_url ?? null,
    status: raw.status ?? "scheduled",
    scheduled_at: raw.scheduled_at ?? null,
    started_at: raw.started_at ?? null,
    ended_at: raw.ended_at ?? null,
    viewer_count: raw.viewer_count ?? 0,
    peak_viewer_count: raw.peak_viewer_count ?? 0,
    metadata: raw.metadata ?? null,
  }
}

export function normalizeLiveProductRecord(
  raw: RawRecord<LiveProductRecord>
): LiveProductRecord {
  const livePrice = raw.live_price ?? raw.special_price ?? null
  const liveStock = raw.live_stock ?? raw.allocated_stock ?? null
  const reservedQuantity = raw.reserved_quantity ?? raw.reserved_stock ?? 0
  const soldQuantity = raw.sold_quantity ?? raw.sold_stock ?? 0
  const pinnedAt = raw.pinned_at ?? null
  const isPinned =
    raw.is_pinned !== undefined ? Boolean(raw.is_pinned) : pinnedAt !== null

  return {
    ...raw,
    live_session_id: raw.live_session_id ?? "",
    product_id: raw.product_id ?? "",
    variant_id: raw.variant_id ?? null,
    live_price: livePrice,
    special_price: raw.special_price ?? livePrice,
    currency_code: raw.currency_code ?? null,
    live_stock: liveStock,
    allocated_stock: raw.allocated_stock ?? liveStock,
    reserved_quantity: reservedQuantity,
    reserved_stock: raw.reserved_stock ?? reservedQuantity,
    sold_quantity: soldQuantity,
    sold_stock: raw.sold_stock ?? soldQuantity,
    pinned_at: pinnedAt,
    is_pinned: isPinned,
    sort_order: raw.sort_order ?? 0,
    metadata: raw.metadata ?? null,
  }
}

export function normalizeCatalogItemRecord(
  raw: RawRecord<CatalogSyncItemRecord>
): CatalogSyncItemRecord {
  const socialAccountId = raw.social_account_id ?? raw.account_id ?? ""
  const externalProductId = raw.external_product_id ?? raw.external_item_id ?? null
  const syncStatus = raw.sync_status ?? raw.status ?? "pending"

  return {
    ...raw,
    social_account_id: socialAccountId,
    account_id: raw.account_id ?? socialAccountId,
    platform: raw.platform ?? "tiktok",
    product_id: raw.product_id ?? "",
    variant_id: raw.variant_id ?? "",
    external_catalog_id: raw.external_catalog_id ?? "",
    external_product_id: externalProductId,
    external_item_id: raw.external_item_id ?? externalProductId,
    sync_status: syncStatus,
    status: raw.status ?? syncStatus,
    content_hash: raw.content_hash ?? null,
    last_synced_at: raw.last_synced_at ?? null,
    error_message: raw.error_message ?? null,
    metadata: raw.metadata ?? null,
  }
}
