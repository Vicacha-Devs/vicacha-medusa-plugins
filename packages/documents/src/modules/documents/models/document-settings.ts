import { model } from "@medusajs/framework/utils"

export const DocumentSettings = model
  .define("mpd_document_settings", {
    id: model.id().primaryKey(),
    region_id: model.text().nullable(),
    // Company Identity & Address
    company_name: model.text().default("My Store"),
    company_address: model.text().default(""),
    company_line2: model.text().nullable(),
    company_city: model.text().nullable(),
    company_state: model.text().nullable(),
    company_postal_code: model.text().nullable(),
    company_country: model.text().nullable(),
    company_tax_id: model.text().nullable(),
    company_email: model.text().nullable(),
    company_phone: model.text().nullable(),
    company_website: model.text().nullable(),
    company_logo: model.text().nullable(),
    bank_details: model.text().nullable(),

    // Numbering Sequences per DocumentType
    invoice_prefix: model.text().default("INV"),
    invoice_number_format: model.text().default("INV-{year}-{number}"),
    next_invoice_number: model.number().default(1),
    invoice_forced_next_number: model.number().nullable(),
    invoice_number_padding: model.number().default(5),

    packing_slip_prefix: model.text().default("PS"),
    packing_slip_number_format: model.text().default("PS-{year}-{number}"),
    next_packing_slip_number: model.number().default(1),
    packing_slip_forced_next_number: model.number().nullable(),
    packing_slip_number_padding: model.number().default(5),

    credit_note_prefix: model.text().default("CN"),
    credit_note_number_format: model.text().default("CN-{year}-{number}"),
    next_credit_note_number: model.number().default(1),
    credit_note_forced_next_number: model.number().nullable(),
    credit_note_number_padding: model.number().default(5),

    receipt_prefix: model.text().default("RCP"),
    receipt_number_format: model.text().default("RCP-{year}-{number}"),
    next_receipt_number: model.number().default(1),
    receipt_forced_next_number: model.number().nullable(),
    receipt_number_padding: model.number().default(5),

    // Template Selection & Styling
    invoice_template: model.text().default("clean"),
    packing_slip_template: model.text().default("packing_slip"),
    credit_note_template: model.text().default("credit_note"),
    receipt_template: model.text().default("pos_80mm"),
    primary_color: model.text().default("#18181b"),
    secondary_color: model.text().default("#71717a"),
    font_family: model.text().default("Helvetica"),
    styles_override: model.json().nullable(),
    sections_override: model.json().nullable(),

    // Localization & Rich Text Notes
    default_locale: model.text().default("en"),
    custom_translations: model.json().nullable(),
    notes: model.text().nullable(),
    footer_text: model.text().nullable(),

    // Automation Toggles
    auto_generate_invoice: model.boolean().default(true),
    auto_generate_packing_slip: model.boolean().default(false),
    auto_generate_credit_note: model.boolean().default(true),
    auto_generate_receipt: model.boolean().default(false),
    auto_email_invoice: model.boolean().default(false),
    auto_email_packing_slip: model.boolean().default(false),
    auto_email_credit_note: model.boolean().default(false),
    auto_email_receipt: model.boolean().default(false),

    // Optional Docuseal E-Signature Config
    require_signature: model.boolean().default(false),
    docuseal_template_id: model.text().nullable(),
    signature_role: model.text().default("Customer"),

    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["region_id"],
      unique: true,
      name: "UQ_mpd_document_settings_region_id",
    },
  ])

export default DocumentSettings
