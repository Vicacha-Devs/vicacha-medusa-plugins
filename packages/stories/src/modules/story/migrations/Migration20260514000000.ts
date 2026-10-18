import { Migration } from "@mikro-orm/migrations"

export class Migration20260514000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mps_story_group" (
        "id"                text        NOT NULL,
        "title"             text        NOT NULL,
        "handle"            text        NOT NULL,
        "subtitle"          text        NULL,
        "avatar_url"        text        NULL,
        "ring_theme"        text        NOT NULL DEFAULT 'instagram',
        "custom_ring_color" text        NULL,
        "placement"         text        NOT NULL DEFAULT 'home',
        "target_entity_id"  text        NULL,
        "is_pinned"         boolean     NOT NULL DEFAULT true,
        "is_ephemeral"      boolean     NOT NULL DEFAULT false,
        "is_active"         boolean     NOT NULL DEFAULT true,
        "display_order"     integer     NOT NULL DEFAULT 0,
        "metadata"          jsonb       NULL,
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz NULL,
        CONSTRAINT "PK_mps_story_group" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_group_handle"
        ON "mps_story_group" ("handle")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_group_placement_active"
        ON "mps_story_group" ("placement", "is_active")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "story" (
        "id"                     text        NOT NULL,
        "group_id"               text        NULL,
        "title"                  text        NOT NULL,
        "caption"                text        NULL,
        "media_type"             text        NOT NULL DEFAULT 'image',
        "media_url"              text        NOT NULL,
        "thumbnail_url"          text        NULL,
        "duration_ms"            integer     NOT NULL DEFAULT 5000,
        "link_url"               text        NULL,
        "link_text"              text        NULL,
        "is_active"              boolean     NOT NULL DEFAULT true,
        "display_order"          integer     NOT NULL DEFAULT 0,
        "starts_at"              timestamptz NULL,
        "expires_at"             timestamptz NULL,
        "views_count"            integer     NOT NULL DEFAULT 0,
        "completions_count"      integer     NOT NULL DEFAULT 0,
        "clicks_count"           integer     NOT NULL DEFAULT 0,
        "cart_conversions_count" integer     NOT NULL DEFAULT 0,
        "taps_count"             integer     NOT NULL DEFAULT 0,
        "conversions_count"      integer     NOT NULL DEFAULT 0,
        "metadata"               jsonb       NULL,
        "created_at"             timestamptz NOT NULL DEFAULT now(),
        "updated_at"             timestamptz NOT NULL DEFAULT now(),
        "deleted_at"             timestamptz NULL,
        CONSTRAINT "PK_story" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      ALTER TABLE "story"
        ADD COLUMN IF NOT EXISTS "group_id"               text        NULL,
        ADD COLUMN IF NOT EXISTS "caption"                text        NULL,
        ADD COLUMN IF NOT EXISTS "duration_ms"            integer     NOT NULL DEFAULT 5000,
        ADD COLUMN IF NOT EXISTS "starts_at"              timestamptz NULL,
        ADD COLUMN IF NOT EXISTS "views_count"            integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "completions_count"      integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "clicks_count"           integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "cart_conversions_count" integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "taps_count"             integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "conversions_count"      integer     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "metadata"               jsonb       NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_story_group_id_active"
        ON "story" ("group_id", "is_active")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_story_active_display_order"
        ON "story" ("is_active", "display_order")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mps_story_hotspot" (
        "id"                text        NOT NULL,
        "story_id"          text        NOT NULL,
        "product_id"        text        NOT NULL,
        "variant_id"        text        NULL,
        "product_title"     text        NOT NULL,
        "product_handle"    text        NULL,
        "product_thumbnail" text        NULL,
        "price_formatted"   text        NULL,
        "price_amount"      numeric     NULL,
        "currency_code"     text        NULL,
        "x_percent"         numeric     NOT NULL DEFAULT 50,
        "y_percent"         numeric     NOT NULL DEFAULT 50,
        "label"             text        NULL,
        "badge_style"       text        NOT NULL DEFAULT 'pill',
        "created_at"        timestamptz NOT NULL DEFAULT now(),
        "updated_at"        timestamptz NOT NULL DEFAULT now(),
        "deleted_at"        timestamptz NULL,
        CONSTRAINT "PK_mps_story_hotspot" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_hotspot_story_id"
        ON "mps_story_hotspot" ("story_id")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_hotspot_product_id"
        ON "mps_story_hotspot" ("product_id")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mps_story_sticker" (
        "id"                 text        NOT NULL,
        "story_id"           text        NOT NULL,
        "type"               text        NOT NULL DEFAULT 'poll',
        "prompt"             text        NOT NULL,
        "x_percent"          numeric     NOT NULL DEFAULT 50,
        "y_percent"          numeric     NOT NULL DEFAULT 25,
        "options"            jsonb       NULL,
        "coupon_code"        text        NULL,
        "countdown_until"    text        NULL,
        "total_interactions" integer     NOT NULL DEFAULT 0,
        "metadata"           jsonb       NULL,
        "created_at"         timestamptz NOT NULL DEFAULT now(),
        "updated_at"         timestamptz NOT NULL DEFAULT now(),
        "deleted_at"         timestamptz NULL,
        CONSTRAINT "PK_mps_story_sticker" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_sticker_story_id"
        ON "mps_story_sticker" ("story_id")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mps_story_event" (
        "id"         text        NOT NULL,
        "story_id"   text        NOT NULL,
        "group_id"   text        NULL,
        "event_type" text        NOT NULL,
        "hotspot_id" text        NULL,
        "sticker_id" text        NULL,
        "product_id" text        NULL,
        "session_id" text        NULL,
        "metadata"   jsonb       NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "PK_mps_story_event" PRIMARY KEY ("id")
      );
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_event_story_type"
        ON "mps_story_event" ("story_id", "event_type")
        WHERE "deleted_at" IS NULL;
    `)

    this.addSql(`
      CREATE INDEX IF NOT EXISTS "IDX_mps_story_event_group_type"
        ON "mps_story_event" ("group_id", "event_type")
        WHERE "deleted_at" IS NULL;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "mps_story_event" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mps_story_sticker" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mps_story_hotspot" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "story" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mps_story_group" CASCADE;`)
  }
}
