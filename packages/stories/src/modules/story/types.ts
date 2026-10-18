export const STORIES_MODULE = "stories"
export const LEGACY_STORIES_MODULE = "Story"

export type StoryMediaType = "image" | "video"

export type StoryRingTheme =
  | "instagram"
  | "tiktok"
  | "sunset"
  | "emerald"
  | "violet"
  | "cyber"
  | "neon"
  | "gold"
  | "minimal"
  | "custom"

export type StoryPlacementZone =
  | "home"
  | "collection"
  | "category"
  | "product"
  | "floating_bubble"
  | "global"

export type StoryStickerType =
  | "poll"
  | "countdown"
  | "coupon"
  | "question_badge"

export type StoryEngagementEventType =
  | "impression"
  | "complete"
  | "tap_forward"
  | "tap_back"
  | "exit"
  | "hotspot_click"
  | "link_click"
  | "add_to_cart"
  | "sticker_interact"

export interface StoryHotspotDTO {
  id: string
  story_id: string
  product_id: string
  variant_id?: string | null
  product_title: string
  product_handle?: string | null
  product_thumbnail?: string | null
  price_formatted?: string | null
  price_amount?: number | null
  currency_code?: string | null
  x_percent: number
  y_percent: number
  label?: string | null
  badge_style?: "pill" | "card" | "dot"
  created_at?: string | Date
}

export interface StoryStickerOption {
  id: string
  label: string
  votes: number
}

export interface StoryStickerDTO {
  id: string
  story_id: string
  type: StoryStickerType
  prompt: string
  x_percent: number
  y_percent: number
  options?: StoryStickerOption[] | null
  coupon_code?: string | null
  countdown_until?: string | null
  total_interactions: number
  metadata?: Record<string, unknown> | null
}

/**
 * Backward-compatible with `@bambiste/medusa-stories` fields (`title`, `media_type`,
 * `media_url`, `thumbnail_url`, `link_url`, `link_text`, `is_active`, `display_order`, `expires_at`)
 * while supporting multi-slide Story Groups, X/Y Product Hotspots, Interactive Stickers & Funnel Metrics.
 */
export interface StorySlideDTO {
  id: string
  group_id?: string | null
  title: string
  caption?: string | null
  media_type: StoryMediaType
  media_url: string
  thumbnail_url?: string | null
  duration_ms: number
  link_url?: string | null
  link_text?: string | null
  is_active: boolean
  display_order: number
  starts_at?: string | Date | null
  expires_at?: string | Date | null
  views_count: number
  completions_count: number
  clicks_count: number
  cart_conversions_count: number
  hotspots?: StoryHotspotDTO[]
  stickers?: StoryStickerDTO[]
  metadata?: Record<string, unknown> | null
  created_at?: string | Date
  updated_at?: string | Date
}

export interface StoryGroupDTO {
  id: string
  title: string
  handle: string
  subtitle?: string | null
  avatar_url?: string | null
  ring_theme: StoryRingTheme
  custom_ring_color?: string | null
  placement: StoryPlacementZone
  target_entity_id?: string | null
  is_pinned: boolean
  is_ephemeral: boolean
  is_active: boolean
  display_order: number
  slides?: StorySlideDTO[]
  metadata?: Record<string, unknown> | null
  created_at?: string | Date
  updated_at?: string | Date
}

export interface StoryGroupAnalyticsSummary {
  group_id: string
  group_title: string
  slides_count: number
  impressions: number
  completions: number
  completion_rate_pct: number
  hotspot_clicks: number
  link_clicks: number
  cart_conversions: number
  conversion_rate_pct: number
  sticker_interactions: number
}

export interface StoriesAnalyticsOverview {
  total_groups: number
  active_groups: number
  total_slides: number
  active_slides: number
  total_impressions: number
  total_completions: number
  overall_completion_rate_pct: number
  total_hotspot_clicks: number
  total_link_clicks: number
  total_cart_conversions: number
  overall_conversion_rate_pct: number
  total_sticker_interactions: number
  by_group: StoryGroupAnalyticsSummary[]
  top_slides: Array<{
    id: string
    title: string
    group_title?: string | null
    impressions: number
    completions: number
    hotspot_clicks: number
    cart_conversions: number
  }>
}

export interface StoriesPluginOptions {
  defaultSlideDurationMs?: number
  default_slide_duration_ms?: number
  maxHotspotsPerSlide?: number
  max_hotspots_per_slide?: number
  defaultEphemeralTtlHours?: number
  default_ephemeral_ttl_hours?: number
  defaultRingTheme?: StoryRingTheme
  default_ring_theme?: StoryRingTheme
}

export interface StoriesQueryHookOptions<TData> {
  enabled?: boolean
  initialData?: TData
}

export interface StoriesMutationHookOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}
