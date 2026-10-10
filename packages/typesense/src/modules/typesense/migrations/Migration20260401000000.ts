import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260401000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "mpt_sync_job" (
        "id" text not null,
        "entity" text not null,
        "collection_name" text not null,
        "alias_name" text null,
        "locale" text not null default 'en',
        "action" text check ("action" in ('full_reindex', 'zero_downtime_swap', 'incremental_upsert', 'incremental_delete', 'reconcile')) not null default 'full_reindex',
        "status" text check ("status" in ('pending', 'running', 'completed', 'failed')) not null default 'pending',
        "documents_processed" integer not null default 0,
        "documents_failed" integer not null default 0,
        "duration_ms" integer null,
        "triggered_by" text not null default 'system',
        "error_message" text null,
        "started_at" timestamptz null,
        "completed_at" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpt_sync_job_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpt_sync_job_entity" ON "mpt_sync_job" (entity) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpt_sync_job_status" ON "mpt_sync_job" (status) WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mpt_entity_config" (
        "id" text not null,
        "entity" text not null,
        "is_custom" boolean not null default false,
        "enabled" boolean not null default true,
        "graph_entity" text null,
        "graph_fields" jsonb null,
        "query_by" jsonb null,
        "query_by_weights" jsonb null,
        "facet_by" jsonb null,
        "default_sort_by" text null,
        "enable_nested_fields" boolean not null default true,
        "embedder_config" jsonb null,
        "locales" jsonb null,
        "stopwords_set_id" text null,
        "events_config" jsonb null,
        "schema_fields" jsonb null,
        "storefront_filter_constraint" text null,
        "settings" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpt_entity_config_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpt_entity_config_entity" ON "mpt_entity_config" (entity) WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "mpt_search_analytics" (
        "id" text not null,
        "entity" text not null default 'products',
        "query" text not null,
        "normalized_query" text not null,
        "mode" text check ("mode" in ('keyword', 'semantic', 'hybrid', 'conversational')) not null default 'keyword',
        "locale" text not null default 'en',
        "results_count" integer not null default 0,
        "is_no_hit" boolean not null default false,
        "latency_ms" integer not null default 0,
        "clicked_document_id" text null,
        "click_position" integer null,
        "converted" boolean not null default false,
        "sales_channel_id" text null,
        "filters_snapshot" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "mpt_search_analytics_pkey" primary key ("id")
      );`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpt_search_analytics_entity_query" ON "mpt_search_analytics" (entity, normalized_query) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpt_search_analytics_no_hit" ON "mpt_search_analytics" (is_no_hit) WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mpt_search_analytics" cascade;`)
    this.addSql(`drop table if exists "mpt_entity_config" cascade;`)
    this.addSql(`drop table if exists "mpt_sync_job" cascade;`)
  }
}
