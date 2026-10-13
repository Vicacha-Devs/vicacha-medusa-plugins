import { Migration } from "@mikro-orm/migrations"

export class Migration20261009000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mpd_document" (
        "id" text NOT NULL,
        "document_number" text NOT NULL,
        "document_type" text CHECK ("document_type" IN ('invoice', 'packing_slip', 'credit_note', 'receipt')) NOT NULL DEFAULT 'invoice',
        "status" text CHECK ("status" IN ('draft', 'generated', 'failed')) NOT NULL DEFAULT 'draft',
        "version" integer NOT NULL DEFAULT 1,
        "is_stale" boolean NOT NULL DEFAULT false,
        "stale_reason" text NULL,
        "order_id" text NOT NULL,
        "fulfillment_id" text NULL,
        "refund_id" text NULL,
        "related_document_id" text NULL,
        "template_id" text NULL,
        "locale" text NOT NULL DEFAULT 'en',
        "file_id" text NULL,
        "file_url" text NULL,
        "file_size" integer NULL,
        "settings_snapshot" jsonb NULL,
        "render_context_snapshot" jsonb NULL,
        "prior_versions" jsonb NULL,
        "audit_log" jsonb NULL,
        "error_message" text NULL,
        "generated_at" timestamptz NULL,
        "emailed_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "mpd_document_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_document_order_id" ON "mpd_document" ("order_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpd_document_type_number_version" ON "mpd_document" ("document_type", "document_number", "version") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_document_related_id" ON "mpd_document" ("related_document_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_document_fulfillment_id" ON "mpd_document" ("fulfillment_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_document_refund_id" ON "mpd_document" ("refund_id") WHERE "deleted_at" IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mpd_document_settings" (
        "id" text NOT NULL,
        "region_id" text NULL,
        "company_name" text NOT NULL DEFAULT 'My Store',
        "company_address" text NOT NULL DEFAULT '',
        "company_line2" text NULL,
        "company_city" text NULL,
        "company_state" text NULL,
        "company_postal_code" text NULL,
        "company_country" text NULL,
        "company_tax_id" text NULL,
        "company_email" text NULL,
        "company_phone" text NULL,
        "company_website" text NULL,
        "company_logo" text NULL,
        "bank_details" text NULL,
        "invoice_prefix" text NOT NULL DEFAULT 'INV',
        "invoice_number_format" text NOT NULL DEFAULT 'INV-{year}-{number}',
        "next_invoice_number" integer NOT NULL DEFAULT 1,
        "invoice_forced_next_number" integer NULL,
        "invoice_number_padding" integer NOT NULL DEFAULT 5,
        "packing_slip_prefix" text NOT NULL DEFAULT 'PS',
        "packing_slip_number_format" text NOT NULL DEFAULT 'PS-{year}-{number}',
        "next_packing_slip_number" integer NOT NULL DEFAULT 1,
        "packing_slip_forced_next_number" integer NULL,
        "packing_slip_number_padding" integer NOT NULL DEFAULT 5,
        "credit_note_prefix" text NOT NULL DEFAULT 'CN',
        "credit_note_number_format" text NOT NULL DEFAULT 'CN-{year}-{number}',
        "next_credit_note_number" integer NOT NULL DEFAULT 1,
        "credit_note_forced_next_number" integer NULL,
        "credit_note_number_padding" integer NOT NULL DEFAULT 5,
        "receipt_prefix" text NOT NULL DEFAULT 'RCP',
        "receipt_number_format" text NOT NULL DEFAULT 'RCP-{year}-{number}',
        "next_receipt_number" integer NOT NULL DEFAULT 1,
        "receipt_forced_next_number" integer NULL,
        "receipt_number_padding" integer NOT NULL DEFAULT 5,
        "invoice_template" text NOT NULL DEFAULT 'clean',
        "packing_slip_template" text NOT NULL DEFAULT 'packing_slip',
        "credit_note_template" text NOT NULL DEFAULT 'credit_note',
        "receipt_template" text NOT NULL DEFAULT 'pos_80mm',
        "primary_color" text NOT NULL DEFAULT '#18181b',
        "secondary_color" text NOT NULL DEFAULT '#71717a',
        "font_family" text NOT NULL DEFAULT 'Helvetica',
        "styles_override" jsonb NULL,
        "sections_override" jsonb NULL,
        "default_locale" text NOT NULL DEFAULT 'en',
        "custom_translations" jsonb NULL,
        "notes" text NULL,
        "footer_text" text NULL,
        "auto_generate_invoice" boolean NOT NULL DEFAULT true,
        "auto_generate_packing_slip" boolean NOT NULL DEFAULT false,
        "auto_generate_credit_note" boolean NOT NULL DEFAULT true,
        "auto_generate_receipt" boolean NOT NULL DEFAULT false,
        "auto_email_invoice" boolean NOT NULL DEFAULT false,
        "auto_email_packing_slip" boolean NOT NULL DEFAULT false,
        "auto_email_credit_note" boolean NOT NULL DEFAULT false,
        "auto_email_receipt" boolean NOT NULL DEFAULT false,
        "require_signature" boolean NOT NULL DEFAULT false,
        "docuseal_template_id" text NULL,
        "signature_role" text NOT NULL DEFAULT 'Customer',
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "mpd_document_settings_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_mpd_document_settings_region_id" ON "mpd_document_settings" ("region_id") WHERE "deleted_at" IS NULL AND "region_id" IS NOT NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mpd_document_template" (
        "id" text NOT NULL,
        "name" text NOT NULL,
        "description" text NULL,
        "document_type" text CHECK ("document_type" IN ('invoice', 'packing_slip', 'credit_note', 'receipt')) NOT NULL DEFAULT 'invoice',
        "engine" text CHECK ("engine" IN ('react-pdf', 'handlebars')) NOT NULL DEFAULT 'handlebars',
        "preset_key" text NULL,
        "page_size" text CHECK ("page_size" IN ('A4', 'LETTER', '80MM', '58MM')) NOT NULL DEFAULT 'A4',
        "orientation" text CHECK ("orientation" IN ('portrait', 'landscape')) NOT NULL DEFAULT 'portrait',
        "html_content" text NULL,
        "styles" jsonb NULL,
        "sections" jsonb NULL,
        "is_default" boolean NOT NULL DEFAULT false,
        "is_system" boolean NOT NULL DEFAULT false,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "mpd_document_template_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_template_type_default" ON "mpd_document_template" ("document_type", "is_default") WHERE "deleted_at" IS NULL;`
    )

    this.addSql(`
      CREATE TABLE IF NOT EXISTS "mpd_signature_request" (
        "id" text NOT NULL,
        "document_id" text NOT NULL,
        "order_id" text NOT NULL,
        "docuseal_submission_id" integer NOT NULL,
        "docuseal_submitter_id" integer NULL,
        "signer_email" text NOT NULL,
        "signer_name" text NULL,
        "embed_src" text NULL,
        "status" text CHECK ("status" IN ('pending', 'sent', 'opened', 'completed', 'declined', 'expired')) NOT NULL DEFAULT 'pending',
        "signed_file_id" text NULL,
        "signed_file_url" text NULL,
        "sent_at" timestamptz NULL,
        "opened_at" timestamptz NULL,
        "completed_at" timestamptz NULL,
        "declined_at" timestamptz NULL,
        "decline_reason" text NULL,
        "audit_log_url" text NULL,
        "raw_webhook_payload" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "mpd_signature_request_pkey" PRIMARY KEY ("id")
      );
    `)

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_sig_req_document_id" ON "mpd_signature_request" ("document_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_sig_req_order_id" ON "mpd_signature_request" ("order_id") WHERE "deleted_at" IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_mpd_sig_req_submission_id" ON "mpd_signature_request" ("docuseal_submission_id") WHERE "deleted_at" IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS "mpd_signature_request" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mpd_document_template" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mpd_document_settings" CASCADE;`)
    this.addSql(`DROP TABLE IF EXISTS "mpd_document" CASCADE;`)
  }
}
