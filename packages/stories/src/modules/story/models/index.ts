import { model } from "@medusajs/framework/utils"

export const StoryGroup = model
  .define("mps_story_group", {
    id: model.id({ prefix: "sgrp" }).primaryKey(),
    title: model.text().searchable(),
    handle: model.text().searchable(),
    subtitle: model.text().nullable(),
    avatar_url: model.text().nullable(),
    ring_theme: model
      .enum([
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
      .default("instagram"),
    custom_ring_color: model.text().nullable(),
    placement: model
      .enum([
        "home",
        "collection",
        "category",
        "product",
        "floating_bubble",
        "global",
      ])
      .default("home"),
    target_entity_id: model.text().nullable(),
    is_pinned: model.boolean().default(true),
    is_ephemeral: model.boolean().default(false),
    is_active: model.boolean().default(true),
    display_order: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["handle"] },
    { on: ["placement", "is_active"] },
  ])

/**
 * Backward-compatible with `@bambiste/medusa-stories` `Story` model (`title`, `media_type`,
 * `media_url`, `thumbnail_url`, `link_url`, `link_text`, `is_active`, `display_order`, `expires_at`)
 * plus group association, duration, scheduling, and funnel counters.
 */
export const Story = model
  .define("story", {
    id: model.id({ prefix: "stry" }).primaryKey(),
    group_id: model.text().nullable(),
    title: model.text().searchable(),
    caption: model.text().nullable(),
    media_type: model.enum(["image", "video"]).default("image"),
    media_url: model.text(),
    thumbnail_url: model.text().nullable(),
    duration_ms: model.number().default(5000),
    link_url: model.text().nullable(),
    link_text: model.text().nullable(),
    is_active: model.boolean().default(true),
    display_order: model.number().default(0),
    starts_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    views_count: model.number().default(0),
    completions_count: model.number().default(0),
    clicks_count: model.number().default(0),
    cart_conversions_count: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["group_id", "is_active"] },
    { on: ["is_active", "display_order"] },
  ])

export const StoryHotspot = model
  .define("mps_story_hotspot", {
    id: model.id({ prefix: "shsp" }).primaryKey(),
    story_id: model.text(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    product_title: model.text(),
    product_handle: model.text().nullable(),
    product_thumbnail: model.text().nullable(),
    price_formatted: model.text().nullable(),
    price_amount: model.number().nullable(),
    currency_code: model.text().nullable(),
    x_percent: model.number().default(50),
    y_percent: model.number().default(50),
    label: model.text().nullable(),
    badge_style: model.enum(["pill", "card", "dot"]).default("pill"),
  })
  .indexes([
    { on: ["story_id"] },
    { on: ["product_id"] },
  ])

export const StorySticker = model
  .define("mps_story_sticker", {
    id: model.id({ prefix: "sstk" }).primaryKey(),
    story_id: model.text(),
    type: model
      .enum(["poll", "countdown", "coupon", "question_badge"])
      .default("poll"),
    prompt: model.text(),
    x_percent: model.number().default(50),
    y_percent: model.number().default(25),
    options: model.json().nullable(),
    coupon_code: model.text().nullable(),
    countdown_until: model.text().nullable(),
    total_interactions: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["story_id"] }])

export const StoryEvent = model
  .define("mps_story_event", {
    id: model.id({ prefix: "sevt" }).primaryKey(),
    story_id: model.text(),
    group_id: model.text().nullable(),
    event_type: model.enum([
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
    hotspot_id: model.text().nullable(),
    sticker_id: model.text().nullable(),
    product_id: model.text().nullable(),
    session_id: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["story_id", "event_type"] },
    { on: ["group_id", "event_type"] },
  ])

export const StoriesModels = {
  StoryGroup,
  Story,
  StoryHotspot,
  StorySticker,
  StoryEvent,
}
