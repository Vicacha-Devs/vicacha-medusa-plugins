import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260412000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "mpo_setting" (
        "id" text not null,
        "key" text not null,
        "value" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_setting_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mpo_setting_key" ON "mpo_setting" ("key") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_erp_mapping" (
        "id" text not null,
        "entity_type" text not null,
        "medusa_id" text not null,
        "odoo_id" integer not null,
        "odoo_model" text not null default '',
        "sync_direction" text not null default 'bidirectional',
        "sync_version" integer not null default 1,
        "external_checksum" text null,
        "status" text not null default 'active',
        "last_synced_at" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_erp_mapping_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `ALTER TABLE "mpo_erp_mapping" ADD COLUMN IF NOT EXISTS "sync_version" integer not null default 1;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_erp_mapping_entity_medusa" ON "mpo_erp_mapping" ("entity_type", "medusa_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_erp_mapping_entity_odoo" ON "mpo_erp_mapping" ("entity_type", "odoo_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_sync_log" (
        "id" text not null,
        "entity_type" text not null,
        "direction" text not null default 'odoo_to_medusa',
        "trigger" text not null default 'manual',
        "status" text not null default 'running',
        "created_count" integer not null default 0,
        "updated_count" integer not null default 0,
        "skipped_count" integer not null default 0,
        "failed_count" integer not null default 0,
        "duration_ms" integer not null default 0,
        "message" text null,
        "error_details" jsonb null,
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_sync_log_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_sync_log_entity" ON "mpo_sync_log" ("entity_type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_sync_log_status" ON "mpo_sync_log" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_sync_failure" (
        "id" text not null,
        "entity_type" text not null,
        "medusa_id" text null,
        "odoo_id" integer null,
        "direction" text not null default 'medusa_to_odoo',
        "trigger" text not null default 'event',
        "payload" jsonb null,
        "error_message" text not null,
        "attempt_count" integer not null default 1,
        "resolved" boolean not null default false,
        "resolved_at" timestamptz null,
        "resolved_by" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_sync_failure_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_sync_failure_resolved" ON "mpo_sync_failure" ("resolved") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_sync_failure_entity" ON "mpo_sync_failure" ("entity_type") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_inventory_snapshot" (
        "id" text not null,
        "product_id" text not null default '',
        "variant_id" text not null,
        "sku" text null,
        "location_id" text not null default '',
        "odoo_product_id" integer null,
        "odoo_location_id" integer null,
        "quantity_medusa" integer not null default 0,
        "quantity_odoo" integer not null default 0,
        "delta" integer not null default 0,
        "reconciled" boolean not null default false,
        "resolution_action" text not null default 'none',
        "snapshot_at" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_inventory_snapshot_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_inv_snapshot_variant" ON "mpo_inventory_snapshot" ("variant_id") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_reconciliation_log" (
        "id" text not null,
        "reconciliation_type" text not null default 'inventory',
        "strategy" text not null default 'odoo_wins',
        "drift_threshold" integer not null default 0,
        "triggered_by" text not null default 'manual',
        "status" text not null default 'running',
        "checked_count" integer not null default 0,
        "matched_count" integer not null default 0,
        "drifted_count" integer not null default 0,
        "fixed_count" integer not null default 0,
        "conflict_count" integer not null default 0,
        "error_count" integer not null default 0,
        "details" jsonb null,
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_reconciliation_log_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_reconcil_log_status" ON "mpo_reconciliation_log" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_conflict_resolution" (
        "id" text not null,
        "entity_type" text not null default 'inventory',
        "medusa_id" text not null,
        "odoo_id" integer null,
        "field_name" text not null default 'stocked_quantity',
        "medusa_value" jsonb null,
        "odoo_value" jsonb null,
        "strategy" text not null default 'manual_conflict',
        "status" text not null default 'open',
        "resolved_value" jsonb null,
        "resolved_by" text null,
        "resolved_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_conflict_resolution_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_conflict_status" ON "mpo_conflict_resolution" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_barcode_scan_log" (
        "id" text not null,
        "barcode" text not null,
        "context" text not null default 'pos',
        "device_id" text null,
        "session_id" text null,
        "operator_id" text null,
        "variant_id" text null,
        "odoo_product_id" integer null,
        "source" text not null default 'none',
        "resolution_status" text not null default 'resolved',
        "latency_ms" integer not null default 0,
        "scan_timestamp" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_barcode_scan_log_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `ALTER TABLE "mpo_barcode_scan_log" ADD COLUMN IF NOT EXISTS "device_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_barcode_scan_log" ADD COLUMN IF NOT EXISTS "session_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_barcode_scan_log" ADD COLUMN IF NOT EXISTS "operator_id" text null;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_barcode_scan_code" ON "mpo_barcode_scan_log" ("barcode") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_offline_pos_transaction" (
        "id" text not null,
        "external_transaction_id" text not null,
        "device_id" text null,
        "session_id" text null,
        "pos_location_id" text null,
        "cart_id" text null,
        "payment_method" text null,
        "customer_id" text null,
        "customer_email" text null,
        "currency" text not null default 'USD',
        "total_cents" integer not null default 0,
        "discount_cents" integer not null default 0,
        "items" jsonb not null,
        "status" text not null default 'pending',
        "medusa_order_id" text null,
        "odoo_order_id" integer null,
        "replay_attempt_count" integer not null default 0,
        "replay_error" text null,
        "replayed_at" timestamptz null,
        "last_replay_at" timestamptz null,
        "next_retry_at" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_offline_pos_transaction_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `ALTER TABLE "mpo_offline_pos_transaction" ADD COLUMN IF NOT EXISTS "device_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_offline_pos_transaction" ADD COLUMN IF NOT EXISTS "session_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_offline_pos_transaction" ADD COLUMN IF NOT EXISTS "pos_location_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_offline_pos_transaction" ADD COLUMN IF NOT EXISTS "cart_id" text null;`
    )
    this.addSql(
      `ALTER TABLE "mpo_offline_pos_transaction" ADD COLUMN IF NOT EXISTS "payment_method" text null;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mpo_offline_pos_ext_id" ON "mpo_offline_pos_transaction" ("external_transaction_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpo_offline_pos_status" ON "mpo_offline_pos_transaction" ("status") WHERE deleted_at IS NULL;`
    )

    this.addSql(`
      create table if not exists "mpo_webhook_event" (
        "id" text not null,
        "event_id" text not null,
        "event_type" text not null,
        "odoo_model" text null,
        "odoo_record_id" integer null,
        "status" text not null default 'processed',
        "payload" jsonb null,
        "error_message" text null,
        "processed_at" timestamptz not null default now(),
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpo_webhook_event_pkey" primary key ("id")
      );
    `)
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mpo_webhook_event_id" ON "mpo_webhook_event" ("event_id") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mpo_webhook_event" cascade;`)
    this.addSql(`drop table if exists "mpo_offline_pos_transaction" cascade;`)
    this.addSql(`drop table if exists "mpo_barcode_scan_log" cascade;`)
    this.addSql(`drop table if exists "mpo_conflict_resolution" cascade;`)
    this.addSql(`drop table if exists "mpo_reconciliation_log" cascade;`)
    this.addSql(`drop table if exists "mpo_inventory_snapshot" cascade;`)
    this.addSql(`drop table if exists "mpo_sync_failure" cascade;`)
    this.addSql(`drop table if exists "mpo_sync_log" cascade;`)
    this.addSql(`drop table if exists "mpo_erp_mapping" cascade;`)
    this.addSql(`drop table if exists "mpo_setting" cascade;`)
  }
}
