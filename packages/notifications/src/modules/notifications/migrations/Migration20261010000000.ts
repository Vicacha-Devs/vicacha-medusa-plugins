import { Migration } from "@mikro-orm/migrations"

export class Migration20261010000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mpn_template" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "description" TEXT NULL,
        "channel" TEXT NOT NULL DEFAULT 'email',
        "mode" TEXT NOT NULL DEFAULT 'blocks',
        "locale" TEXT NOT NULL DEFAULT 'en',
        "subject" TEXT NULL,
        "raw_content" TEXT NULL,
        "variable_map" JSONB NULL,
        "meta_template_name" TEXT NULL,
        "meta_language_code" TEXT NULL,
        "styles" JSONB NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "source_preset_id" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_mpn_template_channel_locale" ON "mpn_template" ("channel", "locale") WHERE "deleted_at" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_mpn_template_name" ON "mpn_template" ("name") WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_template_block" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "template_id" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "position" INTEGER NOT NULL DEFAULT 0,
        "parent_id" TEXT NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_mpn_template_block_template_id" ON "mpn_template_block" ("template_id", "position") WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_event_mapping" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "event_name" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'email',
        "template_id" TEXT NOT NULL,
        "recipient_rule" TEXT NOT NULL DEFAULT 'customer_auto',
        "custom_recipient" TEXT NULL,
        "sender_profile_index" INTEGER NOT NULL DEFAULT 1,
        "telegram_thread_id" INTEGER NULL,
        "attach_document_types" JSONB NULL,
        "variable_map" JSONB NULL,
        "conditions" JSONB NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "priority" INTEGER NOT NULL DEFAULT 0,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_mpn_event_mapping_event_active" ON "mpn_event_mapping" ("event_name", "is_active") WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_delivery_log" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "idempotency_key" TEXT NOT NULL,
        "event_name" TEXT NOT NULL,
        "entity_id" TEXT NULL,
        "channel" TEXT NOT NULL,
        "provider_id" TEXT NULL,
        "driver" TEXT NULL,
        "template_id" TEXT NULL,
        "mapping_id" TEXT NULL,
        "recipient_masked" TEXT NOT NULL,
        "recipient_hash" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "attempts" INTEGER NOT NULL DEFAULT 1,
        "external_message_id" TEXT NULL,
        "payload_redacted" JSONB NULL,
        "error_code" TEXT NULL,
        "error_message" TEXT NULL,
        "sent_at" TIMESTAMPTZ NULL,
        "delivered_at" TIMESTAMPTZ NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpn_delivery_log_idempotency_active"
        ON "mpn_delivery_log" ("idempotency_key")
        WHERE "status" IN ('pending', 'sent', 'delivered') AND "deleted_at" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_mpn_delivery_log_entity_id" ON "mpn_delivery_log" ("entity_id", "created_at" DESC) WHERE "deleted_at" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_mpn_delivery_log_channel_status" ON "mpn_delivery_log" ("channel", "status") WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_consent_record" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "identifier" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'sms',
        "customer_id" TEXT NULL,
        "status" TEXT NOT NULL DEFAULT 'opted_in',
        "source" TEXT NOT NULL DEFAULT 'checkout',
        "first_message_sent" BOOLEAN NOT NULL DEFAULT FALSE,
        "last_cart_recovery_at" TIMESTAMPTZ NULL,
        "opted_in_at" TIMESTAMPTZ NULL,
        "opted_out_at" TIMESTAMPTZ NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpn_consent_identifier_channel"
        ON "mpn_consent_record" ("identifier", "channel")
        WHERE "deleted_at" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_mpn_consent_customer" ON "mpn_consent_record" ("customer_id") WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_broadcast_campaign" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "channel" TEXT NOT NULL DEFAULT 'sms',
        "template_id" TEXT NOT NULL,
        "customer_group_id" TEXT NULL,
        "custom_recipients" JSONB NULL,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "scheduled_at" TIMESTAMPTZ NULL,
        "sent_at" TIMESTAMPTZ NULL,
        "total_recipients" INTEGER NOT NULL DEFAULT 0,
        "sent_count" INTEGER NOT NULL DEFAULT 0,
        "failed_count" INTEGER NOT NULL DEFAULT 0,
        "attributed_orders_count" INTEGER NOT NULL DEFAULT 0,
        "attributed_revenue" NUMERIC NOT NULL DEFAULT 0,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );

      CREATE TABLE IF NOT EXISTS "mpn_channel_config" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "channel" TEXT NOT NULL,
        "driver" TEXT NOT NULL DEFAULT 'default',
        "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
        "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "verified_at" TIMESTAMPTZ NULL,
        "rate_limit_per_sec" INTEGER NOT NULL DEFAULT 10,
        "config_json" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpn_channel_config_channel"
        ON "mpn_channel_config" ("channel")
        WHERE "deleted_at" IS NULL;

      CREATE TABLE IF NOT EXISTS "mpn_sandbox_message" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "channel" TEXT NOT NULL DEFAULT 'sms',
        "recipient" TEXT NOT NULL,
        "sender" TEXT NULL,
        "subject" TEXT NULL,
        "body" TEXT NOT NULL,
        "html" TEXT NULL,
        "otp_code" TEXT NULL,
        "media_urls" JSONB NULL,
        "attachments_meta" JSONB NULL,
        "metadata" JSONB NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at" TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS "IDX_mpn_sandbox_message_created" ON "mpn_sandbox_message" ("created_at" DESC) WHERE "deleted_at" IS NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      DROP TABLE IF EXISTS "mpn_sandbox_message" CASCADE;
      DROP TABLE IF EXISTS "mpn_channel_config" CASCADE;
      DROP TABLE IF EXISTS "mpn_broadcast_campaign" CASCADE;
      DROP TABLE IF EXISTS "mpn_consent_record" CASCADE;
      DROP TABLE IF EXISTS "mpn_delivery_log" CASCADE;
      DROP TABLE IF EXISTS "mpn_event_mapping" CASCADE;
      DROP TABLE IF EXISTS "mpn_template_block" CASCADE;
      DROP TABLE IF EXISTS "mpn_template" CASCADE;
    `)
  }
}
