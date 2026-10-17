import { model } from "@medusajs/framework/utils"

/**
 * Unified model for Shoppable Videos, Instagram Reels, Posts, Carousels,
 * synced 24-hour IG/FB Stories, and manual on-site Admin Stories.
 */
export const SocialMediaPost = model
  .define("social_media_post", {
    id: model.id().primaryKey(),
    social_account_id: model.text().nullable(),
    platform: model.enum(["tiktok", "instagram", "facebook", "local"]).default("local"),
    media_type: model.enum(["video", "reel", "story", "image", "carousel"]).default("video"),
    external_id: model.text(),
    title: model.text().nullable(),
    caption: model.text().nullable(),
    media_url: model.text().nullable(),
    thumbnail_url: model.text().nullable(),
    embed_link: model.text().nullable(),
    permalink: model.text().nullable(),
    link_url: model.text().nullable(),
    link_text: model.text().nullable(),
    duration_seconds: model.number().default(0),
    display_order: model.number().default(0),
    is_featured: model.boolean().default(false),
    metrics: model.json().nullable(),
    status: model.enum(["active", "expired", "deleted", "private"]).default("active"),
    published_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["social_account_id"] },
    { on: ["platform", "media_type", "status"] },
    { on: ["platform", "external_id"], unique: true },
  ])
