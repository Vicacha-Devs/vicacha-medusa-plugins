import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260912010000 extends Migration {
  async up(): Promise<void> {
    // quote
    this.addSql(
      'create table if not exists "quote" ("id" text not null, "status" text check ("status" in (\'pending_merchant\', \'pending_customer\', \'accepted\', \'customer_rejected\', \'merchant_rejected\', \'expired\')) not null default \'pending_merchant\', "customer_id" text not null, "draft_order_id" text not null, "order_change_id" text null, "cart_id" text not null, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "quote_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_deleted_at" ON "quote" (deleted_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_customer_id" ON "quote" (customer_id) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_status" ON "quote" (status) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_customer_status" ON "quote" (customer_id, status) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_quote_draft_order_id" ON "quote" (draft_order_id) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_quote_cart_id" ON "quote" (cart_id) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_created_at" ON "quote" (created_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_quote_expires_at" ON "quote" (expires_at) WHERE deleted_at IS NULL AND expires_at IS NOT NULL;'
    );

    // message
    this.addSql(
      'create table if not exists "message" ("id" text not null, "text" text not null, "item_id" text null, "admin_id" text null, "customer_id" text null, "quote_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "message_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_message_deleted_at" ON "message" (deleted_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_message_quote_id_created_at" ON "message" (quote_id, created_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_message_customer_id" ON "message" (customer_id) WHERE deleted_at IS NULL AND customer_id IS NOT NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_message_admin_id" ON "message" (admin_id) WHERE deleted_at IS NULL AND admin_id IS NOT NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_message_item_id" ON "message" (item_id) WHERE deleted_at IS NULL AND item_id IS NOT NULL;'
    );
    this.addSql(
      'alter table if exists "message" add constraint "message_quote_id_foreign" foreign key ("quote_id") references "quote" ("id") on update cascade;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "message" drop constraint if exists "message_quote_id_foreign";'
    );
    this.addSql('drop table if exists "message" cascade;');
    this.addSql('drop table if exists "quote" cascade;');
  }
}
