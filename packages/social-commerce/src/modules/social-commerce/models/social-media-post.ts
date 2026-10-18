import { model } from "@medusajs/framework/utils"

/**
 * Unified model for Shoppable Videos, Instagram Reels, Posts, Carousels,
 * synced 24-hour IG/FB Stories, and manual on-site Admin Stories.
 */
export const SocialMediaPost = model
  .define("social_media_post", {
    id: model.id().primaryKey(),
    social_account_id: model.text().nullable(),
    platform: model.enum(["tiktok", "instagram", "facebook", "local"]),
    platform_post_id: model.text().nullable(),
    external_id: model.text().nullable(),
    media_type: model.enum([
      "video",
      "reel",
      "story",
      "image",
      "carousel",
      "live_replay",
    ]),
    title: model.text().nullable(),
    caption: model.text().nullable(),
    media_url: model.text(),
    thumbnail_url: model.text().nullable(),
    permalink: model.text().nullable(),
    embed_html: model.text().nullable(),
    embed_link: model.text().nullable(),
    link_url: model.text().nullable(),
    link_text: model.text().nullable(),
    cta_url: model.text().nullable(),
    cta_text: model.text().nullable(),
    duration: model.number().nullable(),
    duration_seconds: model.number().nullable(),
    view_count: model.number().default(0),
    like_count: model.number().default(0),
    comment_count: model.number().default(0),
    share_count: model.number().default(0),
    is_shoppable: model.boolean().default(true),
    is_featured: model.boolean().default(false),
    sort_order: model.number().default(0),
    display_order: model.number().default(0),
    metrics: model.json().nullable(),
    status: model
      .enum(["published", "draft", "archived", "expired"])
      .default("published"),
    author_name: model.text().nullable(),
    author_avatar_url: model.text().nullable(),
    published_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["platform", "platform_post_id"],
      name: "IDX_social_media_post_platform_post",
    },
    {
      on: ["platform", "external_id"],
      name: "IDX_social_media_post_platform_external",
    },
    {
      on: ["social_account_id"],
      name: "IDX_social_media_post_account",
    },
    {
      on: ["media_type", "status", "is_featured"],
      name: "IDX_social_media_post_type_status",
    },
  ])
