export class Migration20261013000000 {
  async up(runner?: { addSql?: (sql: string) => void }): Promise<void> {
    const addSql = (sql: string) => {
      if (runner?.addSql) runner.addSql(sql)
      else if ((this as any).addSql) (this as any).addSql(sql)
    }

    addSql(`
      CREATE TABLE IF NOT EXISTS "social_account" (
        "id" text NOT NULL,
        "merchant_id" text NOT NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook')) NOT NULL,
        "external_id" text NOT NULL,
        "username" text NOT NULL,
        "avatar_url" text NULL,
        "encrypted_access_token" text NOT NULL,
        "encrypted_refresh_token" text NULL,
        "token_scope" text NULL,
        "expires_at" timestamptz NOT NULL,
        "follower_count" integer NOT NULL DEFAULT 0,
        "catalog_id" text NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_account_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_social_account_merchant_id" ON "social_account" ("merchant_id") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_social_account_platform_external" ON "social_account" ("platform", "external_id") WHERE deleted_at IS NULL;
    `)

    addSql(`
      CREATE TABLE IF NOT EXISTS "social_media_post" (
        "id" text NOT NULL,
        "social_account_id" text NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook', 'local')) NOT NULL DEFAULT 'local',
        "media_type" text CHECK ("media_type" IN ('video', 'reel', 'story', 'image', 'carousel')) NOT NULL DEFAULT 'video',
        "external_id" text NOT NULL,
        "title" text NULL,
        "caption" text NULL,
        "media_url" text NULL,
        "thumbnail_url" text NULL,
        "embed_link" text NULL,
        "permalink" text NULL,
        "link_url" text NULL,
        "link_text" text NULL,
        "duration_seconds" integer NOT NULL DEFAULT 0,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_featured" boolean NOT NULL DEFAULT false,
        "metrics" jsonb NULL,
        "status" text CHECK ("status" IN ('active', 'expired', 'deleted', 'private')) NOT NULL DEFAULT 'active',
        "published_at" timestamptz NULL,
        "expires_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_media_post_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_social_media_post_account" ON "social_media_post" ("social_account_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_social_media_post_platform_type_status" ON "social_media_post" ("platform", "media_type", "status") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_social_media_post_platform_external" ON "social_media_post" ("platform", "external_id") WHERE deleted_at IS NULL;
    `)

    addSql(`
      CREATE TABLE IF NOT EXISTS "social_product_tag" (
        "id" text NOT NULL,
        "social_post_id" text NOT NULL,
        "product_id" text NOT NULL,
        "variant_id" text NULL,
        "timestamp_seconds" integer NULL,
        "position_x" numeric NULL,
        "position_y" numeric NULL,
        "label" text NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "social_product_tag_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_post" ON "social_product_tag" ("social_post_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_social_product_tag_product" ON "social_product_tag" ("product_id") WHERE deleted_at IS NULL;
    `)

    addSql(`
      CREATE TABLE IF NOT EXISTS "live_session" (
        "id" text NOT NULL,
        "social_account_id" text NOT NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook')) NOT NULL,
        "external_id" text NOT NULL,
        "title" text NULL,
        "stream_url" text NULL,
        "status" text CHECK ("status" IN ('scheduled', 'live', 'ended')) NOT NULL DEFAULT 'live',
        "started_at" timestamptz NULL,
        "ended_at" timestamptz NULL,
        "viewer_count" integer NOT NULL DEFAULT 0,
        "peak_viewer_count" integer NOT NULL DEFAULT 0,
        "metrics" jsonb NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "live_session_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_live_session_account" ON "live_session" ("social_account_id") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_live_session_account_external" ON "live_session" ("social_account_id", "external_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_live_session_platform_status" ON "live_session" ("platform", "status") WHERE deleted_at IS NULL;
    `)

    addSql(`
      CREATE TABLE IF NOT EXISTS "live_product" (
        "id" text NOT NULL,
        "live_session_id" text NOT NULL,
        "product_id" text NOT NULL,
        "variant_id" text NOT NULL,
        "live_price" numeric NULL,
        "allocated_stock" integer NOT NULL DEFAULT 0,
        "reserved_stock" integer NOT NULL DEFAULT 0,
        "sold_stock" integer NOT NULL DEFAULT 0,
        "is_featured" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "live_product_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_live_product_session" ON "live_product" ("live_session_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_live_product_variant" ON "live_product" ("variant_id") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_live_product_session_variant" ON "live_product" ("live_session_id", "variant_id") WHERE deleted_at IS NULL;
    `)

    addSql(`
      CREATE TABLE IF NOT EXISTS "catalog_sync_item" (
        "id" text NOT NULL,
        "social_account_id" text NOT NULL,
        "platform" text CHECK ("platform" IN ('tiktok', 'instagram', 'facebook')) NOT NULL,
        "catalog_id" text NOT NULL,
        "medusa_product_id" text NOT NULL,
        "medusa_variant_id" text NOT NULL,
        "external_item_id" text NULL,
        "sync_status" text CHECK ("sync_status" IN ('synced', 'pending', 'failed')) NOT NULL DEFAULT 'pending',
        "checksum" text NOT NULL,
        "last_synced_at" timestamptz NULL,
        "error_message" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "catalog_sync_item_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_item_account" ON "catalog_sync_item" ("social_account_id") WHERE deleted_at IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_catalog_sync_item_product" ON "catalog_sync_item" ("medusa_product_id") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_catalog_sync_item_account_variant" ON "catalog_sync_item" ("social_account_id", "medusa_variant_id") WHERE deleted_at IS NULL;
    `)
  }

  async down(runner?: { addSql?: (sql: string) => void }): Promise<void> {
    const addSql = (sql: string) => {
      if (runner?.addSql) runner.addSql(sql)
      else if ((this as any).addSql) (this as any).addSql(sql)
    }
    addSql(`DROP TABLE IF EXISTS "catalog_sync_item" CASCADE;`)
    addSql(`DROP TABLE IF EXISTS "live_product" CASCADE;`)
    addSql(`DROP TABLE IF EXISTS "live_session" CASCADE;`)
    addSql(`DROP TABLE IF EXISTS "social_product_tag" CASCADE;`)
    addSql(`DROP TABLE IF EXISTS "social_media_post" CASCADE;`)
    addSql(`DROP TABLE IF EXISTS "social_account" CASCADE;`)
  }
}
