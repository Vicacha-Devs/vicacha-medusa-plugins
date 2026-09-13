import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260912010000 extends Migration {
  async up(): Promise<void> {
    // company
    this.addSql(
      'create table if not exists "company" ("id" text not null, "name" text not null, "email" text not null, "phone" text null, "address" text null, "city" text null, "state" text null, "zip" text null, "country" text null, "logo_url" text null, "currency_code" text null, "spending_limit_reset_frequency" text check ("spending_limit_reset_frequency" in (\'never\', \'daily\', \'weekly\', \'monthly\', \'yearly\')) not null default \'monthly\', "spending_limit_reset_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "company_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_company_deleted_at" ON "company" (deleted_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_company_email" ON "company" (email) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_company_name" ON "company" (name) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_company_currency_code" ON "company" (currency_code) WHERE deleted_at IS NULL AND currency_code IS NOT NULL;'
    );

    // employee
    this.addSql(
      'create table if not exists "employee" ("id" text not null, "spending_limit" numeric not null default 0, "raw_spending_limit" jsonb not null, "is_admin" boolean not null default false, "is_active" boolean not null default true, "company_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "employee_pkey" primary key ("id"));'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_deleted_at" ON "employee" (deleted_at) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_company_id" ON "employee" (company_id) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_company_id_is_admin" ON "employee" (company_id, is_admin) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_company_id_is_active" ON "employee" (company_id, is_active) WHERE deleted_at IS NULL;'
    );
    this.addSql(
      'alter table if exists "employee" add constraint "employee_company_id_foreign" foreign key ("company_id") references "company" ("id") on update cascade;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "employee" drop constraint if exists "employee_company_id_foreign";'
    );
    this.addSql('drop table if exists "employee" cascade;');
    this.addSql('drop table if exists "company" cascade;');
  }
}
