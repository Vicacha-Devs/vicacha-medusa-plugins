import { z } from "@medusajs/framework/zod"
import { MedusaError } from "../modules/social-commerce/index.js"

export const SocialPlatformSchema = z.enum([
  "tiktok",
  "instagram",
  "facebook",
  "local",
])

export const MediaTypeSchema = z.enum([
  "video",
  "reel",
  "story",
  "image",
  "carousel",
])

export const PostStatusSchema = z.enum(["active", "archived", "hidden"])

export const ConnectSocialAccountSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "facebook"]),
  redirect_uri: z.string().url().optional(),
  scopes: z.array(z.string().min(1)).optional(),
})

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1, "Authorization code is required"),
  state: z.string().min(1, "OAuth state is required"),
  redirect_uri: z.string().url().optional(),
})

export const SyncMediaRequestSchema = z.object({
  account_id: z.string().min(1).optional(),
  platform: SocialPlatformSchema.optional(),
  include_stories: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export const TagProductItemSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().min(1).nullable().optional(),
  timestamp_seconds: z.number().int().min(0).nullable().optional(),
  position_x: z.number().min(0).max(100).nullable().optional(),
  position_y: z.number().min(0).max(100).nullable().optional(),
  label: z.string().max(255).nullable().optional(),
  is_featured: z.boolean().optional(),
})

export const CreateLocalStorySchema = z.object({
  caption: z.string().max(2200).nullable().optional(),
  media_url: z.string().url(),
  thumbnail_url: z.string().url().nullable().optional(),
  duration: z.number().int().min(1).max(120).nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  author_name: z.string().max(120).nullable().optional(),
  author_avatar_url: z.string().url().nullable().optional(),
  cta_text: z.string().max(80).nullable().optional(),
  cta_url: z.string().url().nullable().optional(),
  status: PostStatusSchema.optional(),
  product_tags: z.array(TagProductItemSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateMediaPostSchema = z.object({
  caption: z.string().max(2200).nullable().optional(),
  media_url: z.string().url().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  status: PostStatusSchema.optional(),
  is_featured: z.boolean().optional(),
  sort_order: z.number().int().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  author_name: z.string().max(120).nullable().optional(),
  author_avatar_url: z.string().url().nullable().optional(),
  cta_text: z.string().max(80).nullable().optional(),
  cta_url: z.string().url().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const TagProductsOnPostSchema = z.object({
  tags: z.array(TagProductItemSchema),
  replace_existing: z.boolean().optional(),
})

export const CreateLiveSessionSchema = z.object({
  social_account_id: z.string().min(1),
  platform: SocialPlatformSchema.optional(),
  platform_live_id: z.string().nullable().optional(),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).nullable().optional(),
  stream_url: z.string().url().nullable().optional(),
  playback_url: z.string().url().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const LiveSessionActionSchema = z.object({
  action: z.enum(["start", "end"]),
  stream_url: z.string().url().optional(),
  platform_live_id: z.string().optional(),
})

export const AttachLiveProductsSchema = z.object({
  products: z
    .array(
      z.object({
        product_id: z.string().min(1),
        variant_id: z.string().min(1).nullable().optional(),
        live_price: z.number().min(0).nullable().optional(),
        currency_code: z.string().length(3).nullable().optional(),
        live_stock: z.number().int().min(0).nullable().optional(),
        sort_order: z.number().int().optional(),
        is_pinned: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).nullable().optional(),
      })
    )
    .min(1),
})

export const ReserveLiveStockSchema = z.object({
  session_id: z.string().min(1),
  product_id: z.string().min(1),
  variant_id: z.string().min(1),
  quantity: z.number().int().min(1).max(100),
  customer_id: z.string().nullable().optional(),
  cart_id: z.string().nullable().optional(),
  ttl_seconds: z.number().int().min(30).max(3600).optional(),
})

export const CatalogFeedItemSchema = z.object({
  id: z.string().min(1),
  item_group_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  link: z.string().url(),
  image_link: z.string().url(),
  additional_image_links: z.array(z.string().url()).optional(),
  price: z.number().min(0),
  sale_price: z.number().min(0).nullable().optional(),
  currency_code: z.string().min(3).max(3),
  availability: z.enum(["in stock", "out of stock", "preorder", "backorder"]),
  condition: z.enum(["new", "refurbished", "used"]).optional(),
  brand: z.string().optional(),
  google_product_category: z.string().optional(),
  product_type: z.string().optional(),
  gtin: z.string().optional(),
  mpn: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  gender: z.enum(["male", "female", "unisex"]).optional(),
  age_group: z.enum(["newborn", "infant", "toddler", "kids", "adult"]).optional(),
  custom_options: z.record(z.string(), z.string()).optional(),
  inventory_quantity: z.number().int().min(0).optional(),
})

export const SyncCatalogBatchSchema = z.object({
  account_id: z.string().min(1),
  external_catalog_id: z.string().min(1).optional(),
  items: z.array(CatalogFeedItemSchema).min(1),
})

export const CheckoutHandoffSchema = z.object({
  products: z.string().optional(),
  items: z
    .array(
      z.object({
        variant_id: z.string().min(1),
        quantity: z.number().int().min(1).max(1000),
      })
    )
    .optional(),
  coupon: z.string().max(64).optional(),
  source_platform: SocialPlatformSchema.optional(),
  source_post_id: z.string().max(128).optional(),
  live_session_id: z.string().max(128).optional(),
  reservation_id: z.string().max(128).optional(),
  redirect: z.union([z.boolean(), z.string()]).optional(),
})

/**
 * Validates input against a Zod schema and throws `MedusaError(INVALID_DATA)` on failure.
 */
export function parseWithMedusaError<T>(
  schema: z.ZodType<T>,
  payload: unknown
): T {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Validation failed: ${details}`
    )
  }
  return parsed.data
}
