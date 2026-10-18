import { model } from "@medusajs/framework/utils"

export const CatalogSyncItem = model
  .define("catalog_sync_item", {
    id: model.id().primaryKey(),
    social_account_id: model.text(),
    platform: model.enum(["tiktok", "instagram", "facebook", "local"]),
    product_id: model.text().nullable(),
    medusa_product_id: model.text().nullable(),
    variant_id: model.text().nullable(),
    medusa_variant_id: model.text().nullable(),
    external_catalog_id: model.text().nullable(),
    catalog_id: model.text().nullable(),
    external_product_id: model.text().nullable(),
    external_item_id: model.text().nullable(),
    sync_status: model
      .enum(["pending", "synced", "failed", "deleted"])
      .default("pending"),
    content_hash: model.text().nullable(),
    checksum: model.text().nullable(),
    last_synced_at: model.dateTime().nullable(),
    error_message: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["social_account_id", "product_id", "variant_id"],
      name: "IDX_catalog_sync_account_product_variant",
    },
    {
      on: ["social_account_id", "medusa_product_id", "medusa_variant_id"],
      name: "IDX_catalog_sync_account_medusa_prod_var",
    },
    {
      on: ["platform", "sync_status"],
      name: "IDX_catalog_sync_platform_status",
    },
  ])
