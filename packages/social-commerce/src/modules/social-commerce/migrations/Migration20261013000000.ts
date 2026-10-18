import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261013000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_account" (
        "id" text NOT NULL,
        "merchant_id" text NOT NULL DEFAULT 'default',
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook', 'local')) NOT NULL,
        "platform_user_id" text NULL,
        "external_id" text NULL,
        "platform_username" text NULL,
        "username" text NULL,
        "display_name" text NULL,
        "avatar_url" text NULL,
        "access_token" text NULL,
        "refresh_token" text NULL,
        "encrypted_access_token" text NULL,
        "encrypted_refresh_token" text NULL,
        "scopes" jsonb NULL,
        "token_scope" text NULL,
        "token_expires_at" timestamptz NULL,
        "expires_at" timestamptz NULL,
        "follower_count" integer NOT NULL DEFAULT 0,
        "external_catalog_id" text NULL,
        "external_shop_id" text NULL,
        "catalog_id" text NULL,
        "status" text CHECK ("status" IN ('active', 'expired', 'revoked', 'disconnected')) NOT NULL DEFAULT 'active',
        "is_active" boolean NOT NULL DEFAULT true,
        "last_synced_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_account_pkey" PRIMARY KEY ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_account_platform_user" ON "social_account" ("platform", "platform_user_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_account_platform_external" ON "social_account" ("platform", "external_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_account_merchant_id" ON "social_account" ("merchant_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_account_deleted_at" ON "social_account" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_media_post" (
        "id" text NOT NULL,
        "social_account_id" text NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook', 'local')) NOT NULL,
        "platform_post_id" text NULL,
        "external_id" text NULL,
        "media_type" text CHECK ("media_type" IN ('video', 'reel', 'story', 'image', 'carousel', 'live_replay')) NOT NULL,
        "title" text NULL,
        "caption" text NULL,
        "media_url" text NOT NULL,
        "thumbnail_url" text NULL,
        "permalink" text NULL,
        "embed_html" text NULL,
        "embed_link" text NULL,
        "link_url" text NULL,
        "link_text" text NULL,
        "cta_url" text NULL,
        "cta_text" text NULL,
        "duration" integer NULL,
        "duration_seconds" integer NULL,
        "view_count" integer NOT NULL DEFAULT 0,
        "like_count" integer NOT NULL DEFAULT 0,
        "comment_count" integer NOT NULL DEFAULT 0,
        "share_count" integer NOT NULL DEFAULT 0,
        "is_shoppable" boolean NOT NULL DEFAULT true,
        "is_featured" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "display_order" integer NOT NULL DEFAULT 0,
        "metrics" jsonb NULL,
        "status" text CHECK ("status" IN ('published', 'draft', 'archived', 'expired')) NOT NULL DEFAULT 'published',
        "author_name" text NULL,
        "author_avatar_url" text NULL,
        "published_at" timestamptz NULL,
        "expires_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_media_post_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "social_media_post_social_account_id_foreign" FOREIGN KEY ("social_account_id") REFERENCES "social_account" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_media_post_platform_post" ON "social_media_post" ("platform", "platform_post_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_media_post_platform_external" ON "social_media_post" ("platform", "external_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_media_post_account" ON "social_media_post" ("social_account_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_media_post_type_status" ON "social_media_post" ("media_type", "status", "is_featured");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_media_post_deleted_at" ON "social_media_post" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "social_product_tag" (
        "id" text NOT NULL,
        "social_media_post_id" text NULL,
        "social_post_id" text NULL,
        "product_id" text NOT NULL,
        "variant_id" text NULL,
        "timestamp_seconds" integer NULL,
        "position_x" real NULL,
        "position_y" real NULL,
        "label" text NULL,
        "is_featured" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_product_tag_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "social_product_tag_social_media_post_id_foreign" FOREIGN KEY ("social_media_post_id") REFERENCES "social_media_post" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_media_post_product" ON "social_product_tag" ("social_media_post_id", "product_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_post_product" ON "social_product_tag" ("social_post_id", "product_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_product" ON "social_product_tag" ("product_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_deleted_at" ON "social_product_tag" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "live_session" (
        "id" text NOT NULL,
        "social_account_id" text NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook', 'local')) NOT NULL,
        "platform_live_id" text NULL,
        "external_id" text NULL,
        "title" text NOT NULL,
        "description" text NULL,
        "stream_url" text NULL,
        "playback_url" text NULL,
        "thumbnail_url" text NULL,
        "status" text CHECK ("status" IN ('scheduled', 'live', 'ended', 'cancelled')) NOT NULL DEFAULT 'scheduled',
        "scheduled_at" timestamptz NULL,
        "started_at" timestamptz NULL,
        "ended_at" timestamptz NULL,
        "viewer_count" integer NOT NULL DEFAULT 0,
        "peak_viewer_count" integer NOT NULL DEFAULT 0,
        "pinned_product_id" text NULL,
        "metrics" jsonb NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "live_session_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "live_session_social_account_id_foreign" FOREIGN KEY ("social_account_id") REFERENCES "social_account" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_live_session_account" ON "live_session" ("social_account_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_live_session_platform_status" ON "live_session" ("platform", "status");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_live_session_deleted_at" ON "live_session" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "live_product" (
        "id" text NOT NULL,
        "live_session_id" text NOT NULL,
        "product_id" text NOT NULL,
        "variant_id" text NULL,
        "live_price" numeric NULL,
        "raw_live_price" jsonb NULL,
        "currency_code" text NULL,
        "live_stock" integer NULL,
        "allocated_stock" integer NOT NULL DEFAULT 0,
        "reserved_quantity" integer NOT NULL DEFAULT 0,
        "reserved_stock" integer NOT NULL DEFAULT 0,
        "sold_quantity" integer NOT NULL DEFAULT 0,
        "sold_stock" integer NOT NULL DEFAULT 0,
        "is_featured" boolean NOT NULL DEFAULT false,
        "pinned_at" timestamptz NULL,
        "sort_order" integer NOT NULL DEFAULT 0,
        "display_order" integer NOT NULL DEFAULT 0,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "live_product_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "live_product_live_session_id_foreign" FOREIGN KEY ("live_session_id") REFERENCES "live_session" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_live_product_session_product" ON "live_product" ("live_session_id", "product_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_live_product_deleted_at" ON "live_product" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "catalog_sync_item" (
        "id" text NOT NULL,
        "social_account_id" text NOT NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook', 'local')) NOT NULL,
        "product_id" text NULL,
        "medusa_product_id" text NULL,
        "variant_id" text NULL,
        "medusa_variant_id" text NULL,
        "external_catalog_id" text NULL,
        "catalog_id" text NULL,
        "external_product_id" text NULL,
        "external_item_id" text NULL,
        "sync_status" text CHECK ("sync_status" IN ('pending', 'synced', 'failed', 'deleted')) NOT NULL DEFAULT 'pending',
        "content_hash" text NULL,
        "checksum" text NULL,
        "last_synced_at" timestamptz NULL,
        "error_message" text NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "catalog_sync_item_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "catalog_sync_item_social_account_id_foreign" FOREIGN KEY ("social_account_id") REFERENCES "social_account" ("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_account_product_variant" ON "catalog_sync_item" ("social_account_id", "product_id", "variant_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_account_medusa_prod_var" ON "catalog_sync_item" ("social_account_id", "medusa_product_id", "medusa_variant_id");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_platform_status" ON "catalog_sync_item" ("platform", "sync_status");`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_item_deleted_at" ON "catalog_sync_item" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "catalog_sync_item" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "live_product" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "live_session" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "social_product_tag" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "social_media_post" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "social_account" CASCADE;`)
  }
}
