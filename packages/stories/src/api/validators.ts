import { z } from "@medusajs/framework/zod"

export const StoryRingThemeSchema = z.enum([
  "instagram",
  "tiktok",
  "sunset",
  "emerald",
  "violet",
  "cyber",
  "neon",
  "gold",
  "minimal",
  "custom",
])

export const StoryPlacementZoneSchema = z.enum([
  "home",
  "collection",
  "category",
  "product",
  "floating_bubble",
  "global",
])

export const CreateStoryGroupSchema = z.object({
  title: z.string().min(1).max(160),
  handle: z.string().max(160).optional(),
  subtitle: z.string().max(240).nullable().optional(),
  avatar_url: z.string().max(1024).nullable().optional(),
  ring_theme: StoryRingThemeSchema.optional(),
  custom_ring_color: z.string().max(32).nullable().optional(),
  placement: StoryPlacementZoneSchema.optional(),
  target_entity_id: z.string().max(256).nullable().optional(),
  is_pinned: z.boolean().optional(),
  is_ephemeral: z.boolean().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).max(10000).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateStoryGroupSchema = CreateStoryGroupSchema.partial()

export const CreateStoryHotspotSchema = z.object({
  product_id: z.string().min(1).max(256),
  variant_id: z.string().max(256).nullable().optional(),
  product_title: z.string().min(1).max(256),
  product_handle: z.string().max(256).nullable().optional(),
  product_thumbnail: z.string().max(1024).nullable().optional(),
  price_formatted: z.string().max(64).nullable().optional(),
  price_amount: z.number().min(0).nullable().optional(),
  currency_code: z.string().max(12).nullable().optional(),
  x_percent: z.number().min(0).max(100),
  y_percent: z.number().min(0).max(100),
  label: z.string().max(120).nullable().optional(),
  badge_style: z.enum(["pill", "card", "dot"]).optional(),
})

export const DeleteStoryHotspotSchema = z.object({
  hotspot_id: z.string().min(1).max(256),
})

export const CreateStoryStickerSchema = z.object({
  type: z.enum(["poll", "countdown", "coupon", "question_badge"]),
  prompt: z.string().min(1).max(280),
  x_percent: z.number().min(0).max(100).optional(),
  y_percent: z.number().min(0).max(100).optional(),
  options: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        label: z.string().min(1).max(120),
        votes: z.number().int().min(0).optional(),
      })
    )
    .max(6)
    .nullable()
    .optional(),
  coupon_code: z.string().max(64).nullable().optional(),
  countdown_until: z.string().max(64).nullable().optional(),
})

export const DeleteStoryStickerSchema = z.object({
  sticker_id: z.string().min(1).max(256),
})

export const CreateStorySlideSchema = z.object({
  group_id: z.string().max(256).nullable().optional(),
  title: z.string().min(1).max(200),
  caption: z.string().max(500).nullable().optional(),
  media_type: z.enum(["image", "video"]).optional(),
  media_url: z.string().min(1).max(1024),
  thumbnail_url: z.string().max(1024).nullable().optional(),
  duration_ms: z.number().int().min(1000).max(60000).optional(),
  link_url: z.string().max(1024).nullable().optional(),
  link_text: z.string().max(120).nullable().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).max(10000).optional(),
  starts_at: z.string().max(64).nullable().optional(),
  expires_at: z.string().max(64).nullable().optional(),
  hotspots: z.array(CreateStoryHotspotSchema).max(20).optional(),
  stickers: z.array(CreateStoryStickerSchema).max(10).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateStorySlideSchema = CreateStorySlideSchema.omit({
  hotspots: true,
  stickers: true,
}).partial()

export const RecordStoryEngagementSchema = z.object({
  event_type: z.enum([
    "impression",
    "complete",
    "tap_forward",
    "tap_back",
    "exit",
    "hotspot_click",
    "link_click",
    "add_to_cart",
    "sticker_interact",
  ]),
  hotspot_id: z.string().max(256).nullable().optional(),
  sticker_id: z.string().max(256).nullable().optional(),
  product_id: z.string().max(256).nullable().optional(),
  session_id: z.string().max(256).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const InteractWithStoryStickerSchema = z.object({
  sticker_id: z.string().min(1).max(256),
  option_id: z.string().max(64).optional(),
  response_text: z.string().max(280).optional(),
  session_id: z.string().max(256).optional(),
})

export type CreateStoryGroupInput = z.infer<typeof CreateStoryGroupSchema>
export type UpdateStoryGroupInput = z.infer<typeof UpdateStoryGroupSchema>
export type CreateStorySlideInput = z.infer<typeof CreateStorySlideSchema>
export type UpdateStorySlideInput = z.infer<typeof UpdateStorySlideSchema>
export type CreateStoryHotspotInput = z.infer<typeof CreateStoryHotspotSchema>
export type DeleteStoryHotspotInput = z.infer<typeof DeleteStoryHotspotSchema>
export type CreateStoryStickerInput = z.infer<typeof CreateStoryStickerSchema>
export type DeleteStoryStickerInput = z.infer<typeof DeleteStoryStickerSchema>
export type RecordStoryEngagementInput = z.infer<
  typeof RecordStoryEngagementSchema
>
export type InteractWithStoryStickerInput = z.infer<
  typeof InteractWithStoryStickerSchema
>
