import { model } from "@medusajs/framework/utils"

export const LiveSession = model
  .define("live_session", {
    id: model.id().primaryKey(),
    social_account_id: model.text().nullable(),
    platform: model.enum(["tiktok", "instagram", "facebook", "local"]),
    platform_live_id: model.text().nullable(),
    external_id: model.text().nullable(),
    title: model.text(),
    description: model.text().nullable(),
    stream_url: model.text().nullable(),
    playback_url: model.text().nullable(),
    thumbnail_url: model.text().nullable(),
    status: model
      .enum(["scheduled", "live", "ended", "cancelled"])
      .default("scheduled"),
    scheduled_at: model.dateTime().nullable(),
    started_at: model.dateTime().nullable(),
    ended_at: model.dateTime().nullable(),
    viewer_count: model.number().default(0),
    peak_viewer_count: model.number().default(0),
    pinned_product_id: model.text().nullable(),
    metrics: model.json().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["social_account_id"],
      name: "IDX_live_session_account",
    },
    {
      on: ["platform", "status"],
      name: "IDX_live_session_platform_status",
    },
  ])
