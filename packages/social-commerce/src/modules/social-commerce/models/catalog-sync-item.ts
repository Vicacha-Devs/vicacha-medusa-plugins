import { model } from "@medusajs/framework/utils"

export const CatalogSyncItem = model
  .define("catalog_sync_item", {
    id: model.id().primaryKey(),
    social_account_id: model.text(),
    platform: model.enum(["tiktok", "instagram", "facebook"]),
    catalog_id: model.text(),
    medusa_product_id: model.text(),
    medusa_variant_id: model.text(),
    external_item_id: model.text().nullable(),
    sync_status: model.enum(["synced", "pending", "failed"]).default("pending"),
    checksum: model.text(),
    last_synced_at: model.dateTime().nullable(),
    error_message: model.text().nullable(),
  })
  .indexes([
    { on: ["social_account_id"] },
    { on: ["medusa_product_id"] },
    { on: ["social_account_id", "medusa_variant_id"], unique: true },
  ])
