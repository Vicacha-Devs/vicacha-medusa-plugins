import { Migration } from "@mikro-orm/migrations"

export class Migration20260514000000 extends Migration {
  override async up(): Promise<void> {
    // 1. product_extension (compatible with @bambiste/medusa-product-ext + extended columns)
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_extension" (
        "id"                   text        NOT NULL,
        "product_id"           text        NOT NULL,
        "videos"               jsonb       NULL DEFAULT '[]',
        "tagline"              text        NULL,
        "media_items"          jsonb       NULL DEFAULT '[]',
        "models_3d"            jsonb       NULL DEFAULT '[]',
        "attachments"          jsonb       NULL DEFAULT '[]',
        "image_alts"           jsonb       NULL DEFAULT '[]',
        "content_tree"         jsonb       NULL,
        "content_diff"         jsonb       NULL,
        "template_id"          text        NULL,
        "feature_ids"          jsonb       NULL DEFAULT '[]',
        "option_metadata"      jsonb       NULL DEFAULT '[]',
        "storefront_overrides" jsonb       NULL DEFAULT '[]',
        "seo_metadata"         jsonb       NULL,
        "metadata"             jsonb       NULL,
        "created_at"           timestamptz NOT NULL DEFAULT now(),
        "updated_at"           timestamptz NOT NULL DEFAULT now(),
        "deleted_at"           timestamptz NULL,
        CONSTRAINT "PK_product_extension" PRIMARY KEY ("id")
      );
    `)

    // Seamless upgrade path from @bambiste/medusa-product-ext
    this.addSql(`
      ALTER TABLE "product_extension"
        ADD COLUMN IF NOT EXISTS "tagline" text NULL,
        ADD COLUMN IF NOT EXISTS "media_items" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "models_3d" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "attachments" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "image_alts" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "content_tree" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "content_diff" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "template_id" text NULL,
        ADD COLUMN IF NOT EXISTS "feature_ids" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "option_metadata" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "storefront_overrides" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "seo_metadata" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL;
    `)

    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_extension_product_id"
      ON "product_extension" ("product_id") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_extension_template_id"
      ON "product_extension" ("template_id") WHERE deleted_at IS NULL;
    `)

    // 2. variant_extension (compatible with @bambiste/medusa-product-ext + extended columns)
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "variant_extension" (
        "id"               text        NOT NULL,
        "variant_id"       text        NOT NULL,
        "product_id"       text        NULL,
        "thumbnail"        text        NULL,
        "images"           jsonb       NULL DEFAULT '[]',
        "videos"           jsonb       NULL DEFAULT '[]',
        "media_items"      jsonb       NULL DEFAULT '[]',
        "option_signature" text        NULL,
        "swatch_color"     text        NULL,
        "swatch_image_url" text        NULL,
        "metadata"         jsonb       NULL,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        "deleted_at"       timestamptz NULL,
        CONSTRAINT "PK_variant_extension" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      ALTER TABLE "variant_extension"
        ADD COLUMN IF NOT EXISTS "product_id" text NULL,
        ADD COLUMN IF NOT EXISTS "thumbnail" text NULL,
        ADD COLUMN IF NOT EXISTS "images" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "videos" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "media_items" jsonb NULL DEFAULT '[]',
        ADD COLUMN IF NOT EXISTS "option_signature" text NULL,
        ADD COLUMN IF NOT EXISTS "swatch_color" text NULL,
        ADD COLUMN IF NOT EXISTS "swatch_image_url" text NULL,
        ADD COLUMN IF NOT EXISTS "metadata" jsonb NULL;
    `)


    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_variant_extension_variant_id"
      ON "variant_extension" ("variant_id") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_variant_extension_product_id"
      ON "variant_extension" ("product_id") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_variant_extension_product_option_sig"
      ON "variant_extension" ("product_id", "option_signature") WHERE deleted_at IS NULL;
    `)

    // 3. product_ext_attribute
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_ext_attribute" (
        "id"               text        NOT NULL,
        "key"              text        NOT NULL,
        "label"            text        NOT NULL,
        "description"      text        NULL,
        "type"             text        NOT NULL DEFAULT 'text',
        "unit_family"      text        NULL,
        "default_unit"     text        NULL,
        "allowed_units"    jsonb       NULL,
        "options"          jsonb       NULL,
        "validation_rules" jsonb       NULL,
        "is_filterable"    boolean     NOT NULL DEFAULT true,
        "is_required"      boolean     NOT NULL DEFAULT false,
        "is_global"        boolean     NOT NULL DEFAULT false,
        "category_ids"     jsonb       NULL DEFAULT '[]',
        "sort_order"       integer     NOT NULL DEFAULT 0,
        "metadata"         jsonb       NULL,
        "created_at"       timestamptz NOT NULL DEFAULT now(),
        "updated_at"       timestamptz NOT NULL DEFAULT now(),
        "deleted_at"       timestamptz NULL,
        CONSTRAINT "PK_product_ext_attribute" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_ext_attribute_key"
      ON "product_ext_attribute" ("key") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attribute_is_filterable"
      ON "product_ext_attribute" ("is_filterable") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attribute_is_global"
      ON "product_ext_attribute" ("is_global") WHERE deleted_at IS NULL;
    `)

    // 4. product_ext_attribute_template
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_ext_attribute_template" (
        "id"             text        NOT NULL,
        "code"           text        NOT NULL,
        "name"           text        NOT NULL,
        "description"    text        NULL,
        "category_ids"   jsonb       NULL DEFAULT '[]',
        "attribute_keys" jsonb       NULL DEFAULT '[]',
        "content_tree"   jsonb       NULL,
        "is_active"      boolean     NOT NULL DEFAULT true,
        "metadata"       jsonb       NULL,
        "created_at"     timestamptz NOT NULL DEFAULT now(),
        "updated_at"     timestamptz NOT NULL DEFAULT now(),
        "deleted_at"     timestamptz NULL,
        CONSTRAINT "PK_product_ext_attribute_template" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_ext_attribute_template_code"
      ON "product_ext_attribute_template" ("code") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attribute_template_is_active"
      ON "product_ext_attribute_template" ("is_active") WHERE deleted_at IS NULL;
    `)

    // 5. product_ext_attribute_value
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_ext_attribute_value" (
        "id"                  text             NOT NULL,
        "product_id"          text             NOT NULL,
        "attribute_id"        text             NOT NULL,
        "attribute_key"       text             NOT NULL,
        "value_text"          text             NULL,
        "value_number"        double precision NULL,
        "value_boolean"       boolean          NULL,
        "value_json"          jsonb            NULL,
        "unit"                text             NULL,
        "value_normalized_si" double precision NULL,
        "sort_order"          integer          NOT NULL DEFAULT 0,
        "locale"              text             NULL,
        "created_at"          timestamptz      NOT NULL DEFAULT now(),
        "updated_at"          timestamptz      NOT NULL DEFAULT now(),
        "deleted_at"          timestamptz      NULL,
        CONSTRAINT "PK_product_ext_attribute_value" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attr_val_product_key"
      ON "product_ext_attribute_value" ("product_id", "attribute_key") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attr_val_key_si"
      ON "product_ext_attribute_value" ("attribute_key", "value_normalized_si") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_attr_val_key_text"
      ON "product_ext_attribute_value" ("attribute_key", "value_text") WHERE deleted_at IS NULL;
    `)

    // 6. product_ext_feature
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "product_ext_feature" (
        "id"          text        NOT NULL,
        "code"        text        NOT NULL,
        "title"       text        NOT NULL,
        "subtitle"    text        NULL,
        "description" text        NULL,
        "icon_url"    text        NULL,
        "icon_name"   text        NULL,
        "badge_color" text        NULL,
        "sort_order"  integer     NOT NULL DEFAULT 0,
        "is_active"   boolean     NOT NULL DEFAULT true,
        "metadata"    jsonb       NULL,
        "created_at"  timestamptz NOT NULL DEFAULT now(),
        "updated_at"  timestamptz NOT NULL DEFAULT now(),
        "deleted_at"  timestamptz NULL,
        CONSTRAINT "PK_product_ext_feature" PRIMARY KEY ("id")
      );
    `)
    this.addSql(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_product_ext_feature_code"
      ON "product_ext_feature" ("code") WHERE deleted_at IS NULL;
    `)
    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_product_ext_feature_is_active"
      ON "product_ext_feature" ("is_active") WHERE deleted_at IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_feature_is_active";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_feature_code";`)
    this.addSql(`DROP TABLE IF EXISTS "product_ext_feature" CASCADE;`)

    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_attr_val_key_text";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_attr_val_key_si";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_attr_val_product_key";`)
    this.addSql(`DROP TABLE IF EXISTS "product_ext_attribute_value" CASCADE;`)

    this.addSql(
      `DROP INDEX IF EXISTS "IDX_product_ext_attribute_template_is_active";`
    )
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_product_ext_attribute_template_code";`
    )
    this.addSql(
      `DROP TABLE IF EXISTS "product_ext_attribute_template" CASCADE;`
    )

    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_attribute_is_global";`)
    this.addSql(
      `DROP INDEX IF EXISTS "IDX_product_ext_attribute_is_filterable";`
    )
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_ext_attribute_key";`)
    this.addSql(`DROP TABLE IF EXISTS "product_ext_attribute" CASCADE;`)

    this.addSql(
      `DROP INDEX IF EXISTS "IDX_variant_extension_product_option_sig";`
    )
    this.addSql(`DROP INDEX IF EXISTS "IDX_variant_extension_product_id";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_variant_extension_variant_id";`)
    this.addSql(`DROP TABLE IF EXISTS "variant_extension" CASCADE;`)

    this.addSql(`DROP INDEX IF EXISTS "IDX_product_extension_template_id";`)
    this.addSql(`DROP INDEX IF EXISTS "IDX_product_extension_product_id";`)
    this.addSql(`DROP TABLE IF EXISTS "product_extension" CASCADE;`)
  }
}
