import { model } from "@medusajs/framework/utils"

export const SocialAccount = model
  .define("social_account", {
    id: model.id().primaryKey(),
    merchant_id: model.text().default("default"),
    platform: model.enum(["tiktok", "instagram", "facebook", "local"]),
    platform_user_id: model.text().nullable(),
    external_id: model.text().nullable(),
    platform_username: model.text().nullable(),
    username: model.text().nullable(),
    display_name: model.text().nullable(),
    avatar_url: model.text().nullable(),
    access_token: model.text().nullable(),
    refresh_token: model.text().nullable(),
    encrypted_access_token: model.text().nullable(),
    encrypted_refresh_token: model.text().nullable(),
    scopes: model.json().nullable(),
    token_scope: model.text().nullable(),
    token_expires_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    follower_count: model.number().default(0),
    external_catalog_id: model.text().nullable(),
    external_shop_id: model.text().nullable(),
    catalog_id: model.text().nullable(),
    status: model
      .enum(["active", "expired", "revoked", "disconnected"])
      .default("active"),
    is_active: model.boolean().default(true),
    last_synced_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["platform", "platform_user_id"],
      name: "IDX_social_account_platform_user",
    },
    {
      on: ["platform", "external_id"],
      name: "IDX_social_account_platform_external",
    },
    {
      on: ["merchant_id"],
      name: "IDX_social_account_merchant_id",
    },
  ])
