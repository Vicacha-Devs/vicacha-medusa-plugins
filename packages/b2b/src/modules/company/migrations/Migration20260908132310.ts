import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260908132310 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table if exists "company" add column if not exists "spending_limit_reset_at" timestamptz null;'
    );
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table if exists "company" drop column if exists "spending_limit_reset_at";'
    );
  }
}
