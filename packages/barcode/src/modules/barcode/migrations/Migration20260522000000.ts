import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260522000000 extends Migration {
  override async up(): Promise<void> {
    // 1. barcode_product
    this.addSql(
      `create table if not exists "barcode_product" (` +
        `"id" text not null, ` +
        `"barcode" text not null, ` +
        `"barcode_type" text not null default 'ean13', ` +
        `"product_id" text not null, ` +
        `"variant_id" text null, ` +
        `"provider" text not null, ` +
        `"product_data" jsonb not null default '{}'::jsonb, ` +
        `"last_synced_at" timestamptz null, ` +
        `"status" text check ("status" in ('created', 'linked', 'updated')) not null default 'created', ` +
        `"metadata" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_product_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_barcode_product_barcode_unique" ON "barcode_product" ("barcode") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_product_product_id" ON "barcode_product" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_product_variant_id" ON "barcode_product" ("variant_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_product_deleted_at" ON "barcode_product" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // 2. barcode_cache
    this.addSql(
      `create table if not exists "barcode_cache" (` +
        `"id" text not null, ` +
        `"barcode" text not null, ` +
        `"barcode_type" text not null default 'ean13', ` +
        `"provider" text not null, ` +
        `"found" boolean not null default false, ` +
        `"response_data" jsonb not null default '{}'::jsonb, ` +
        `"expires_at" timestamptz not null, ` +
        `"hit_count" integer not null default 1, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_cache_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_barcode_cache_barcode_unique" ON "barcode_cache" ("barcode") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_expires_at" ON "barcode_cache" ("expires_at") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_cache_deleted_at" ON "barcode_cache" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // 3. barcode_tag
    this.addSql(
      `create table if not exists "barcode_tag" (` +
        `"id" text not null, ` +
        `"code" text not null, ` +
        `"target_type" text check ("target_type" in ('product', 'variant', 'order', 'custom')) not null default 'product', ` +
        `"target_id" text not null, ` +
        `"product_id" text null, ` +
        `"variant_id" text null, ` +
        `"label" text null, ` +
        `"symbology" text not null default 'qr', ` +
        `"scan_action" text check ("scan_action" in ('view', 'add_to_cart', 'verify', 'gs1_digital_link', 'custom')) not null default 'view', ` +
        `"gs1_gtin" text null, ` +
        `"batch_lot" text null, ` +
        `"serial_number" text null, ` +
        `"hmac_signature" text null, ` +
        `"target_url" text null, ` +
        `"svg_markup" text null, ` +
        `"svg_url" text null, ` +
        `"scan_count" integer not null default 0, ` +
        `"last_scanned_at" timestamptz null, ` +
        `"is_active" boolean not null default true, ` +
        `"metadata" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_tag_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_barcode_tag_code_unique" ON "barcode_tag" ("code") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_tag_target" ON "barcode_tag" ("target_type", "target_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_tag_product_id" ON "barcode_tag" ("product_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_tag_variant_id" ON "barcode_tag" ("variant_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_tag_deleted_at" ON "barcode_tag" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // 4. barcode_label_template
    this.addSql(
      `create table if not exists "barcode_label_template" (` +
        `"id" text not null, ` +
        `"name" text not null, ` +
        `"preset_id" text not null default 'thermal_50x25', ` +
        `"layout_type" text check ("layout_type" in ('thermal_roll', 'a4_sheet')) not null default 'thermal_roll', ` +
        `"width_mm" numeric not null default 50, ` +
        `"height_mm" numeric not null default 25, ` +
        `"columns" integer not null default 1, ` +
        `"rows" integer not null default 1, ` +
        `"margin_top_mm" numeric not null default 2, ` +
        `"margin_left_mm" numeric not null default 2, ` +
        `"gap_x_mm" numeric not null default 0, ` +
        `"gap_y_mm" numeric not null default 2, ` +
        `"symbology" text not null default 'ean13', ` +
        `"show_title" boolean not null default true, ` +
        `"show_variant_title" boolean not null default true, ` +
        `"show_sku" boolean not null default true, ` +
        `"show_price" boolean not null default true, ` +
        `"show_compare_at_price" boolean not null default true, ` +
        `"show_brand" boolean not null default false, ` +
        `"show_qr" boolean not null default false, ` +
        `"custom_header" text null, ` +
        `"custom_footer" text null, ` +
        `"dpi" integer not null default 203, ` +
        `"is_default" boolean not null default false, ` +
        `"metadata" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_label_template_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_label_template_preset_id" ON "barcode_label_template" ("preset_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_label_template_is_default" ON "barcode_label_template" ("is_default") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_label_template_deleted_at" ON "barcode_label_template" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // 5. barcode_count_session
    this.addSql(
      `create table if not exists "barcode_count_session" (` +
        `"id" text not null, ` +
        `"name" text not null, ` +
        `"location_id" text null, ` +
        `"status" text check ("status" in ('draft', 'in_progress', 'completed', 'cancelled')) not null default 'in_progress', ` +
        `"notes" text null, ` +
        `"total_expected" integer not null default 0, ` +
        `"total_counted" integer not null default 0, ` +
        `"total_variance" integer not null default 0, ` +
        `"total_scans" integer not null default 0, ` +
        `"created_by" text null, ` +
        `"completed_at" timestamptz null, ` +
        `"metadata" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_count_session_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_count_session_status" ON "barcode_count_session" ("status") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_count_session_location_id" ON "barcode_count_session" ("location_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_count_session_deleted_at" ON "barcode_count_session" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    // 6. barcode_count_item
    this.addSql(
      `create table if not exists "barcode_count_item" (` +
        `"id" text not null, ` +
        `"session_id" text not null, ` +
        `"barcode" text not null, ` +
        `"variant_id" text null, ` +
        `"product_id" text null, ` +
        `"title" text not null, ` +
        `"variant_title" text null, ` +
        `"sku" text null, ` +
        `"expected_quantity" integer not null default 0, ` +
        `"counted_quantity" integer not null default 0, ` +
        `"variance" integer not null default 0, ` +
        `"last_scanned_at" timestamptz null, ` +
        `"metadata" jsonb null, ` +
        `"created_at" timestamptz not null default now(), ` +
        `"updated_at" timestamptz not null default now(), ` +
        `"deleted_at" timestamptz null, ` +
        `constraint "barcode_count_item_pkey" primary key ("id")` +
        `);`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_count_item_session_id" ON "barcode_count_item" ("session_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_barcode_count_item_session_barcode_unique" ON "barcode_count_item" ("session_id", "barcode") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_barcode_count_item_deleted_at" ON "barcode_count_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "barcode_count_item" cascade;`)
    this.addSql(`drop table if exists "barcode_count_session" cascade;`)
    this.addSql(`drop table if exists "barcode_label_template" cascade;`)
    this.addSql(`drop table if exists "barcode_tag" cascade;`)
    this.addSql(`drop table if exists "barcode_cache" cascade;`)
    this.addSql(`drop table if exists "barcode_product" cascade;`)
  }
}
