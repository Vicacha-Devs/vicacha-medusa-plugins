import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260908215024 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table if exists "employee" add column if not exists "is_active" boolean not null default true;'
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "IDX_employee_company_id_is_active" ON "employee" (company_id, is_active) WHERE deleted_at IS NULL;'
    );
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "IDX_employee_company_id_is_active";');
    this.addSql(
      'alter table if exists "employee" drop column if exists "is_active";'
    );
  }
}
