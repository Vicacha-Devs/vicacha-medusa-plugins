import { model } from "@medusajs/framework/utils"

/**
 * `BarcodeProduct` links a barcode/GTIN to a Medusa Product and Variant,
 * storing the provider metadata and sync status.
 */
export const BarcodeProduct = model
  .define("barcode_product", {
    id: model.id().primaryKey(),
    barcode: model.text().searchable(),
    barcode_type: model.text().default("ean13"),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    provider: model.text(),
    product_data: model.json(),
    last_synced_at: model.dateTime().nullable(),
    status: model.enum(["created", "linked", "updated"]).default("created"),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["barcode"], unique: true },
    { on: ["product_id"] },
    { on: ["variant_id"] },
  ])

/**
 * `BarcodeCache` stores external GTIN lookup responses with TTL expiration and hit counters.
 */
export const BarcodeCache = model
  .define("barcode_cache", {
    id: model.id().primaryKey(),
    barcode: model.text().searchable(),
    barcode_type: model.text().default("ean13"),
    provider: model.text(),
    found: model.boolean().default(false),
    response_data: model.json(),
    expires_at: model.dateTime(),
    hit_count: model.number().default(1),
  })
  .indexes([{ on: ["barcode"], unique: true }, { on: ["expires_at"] }])

/**
 * `BarcodeTag` represents a generated 1D/2D barcode or dynamic QR token
 * with storefront scan actions, GS1 Digital Link metadata, and HMAC-SHA256 anti-counterfeit seal.
 */
export const BarcodeTag = model
  .define("barcode_tag", {
    id: model.id().primaryKey(),
    code: model.text().searchable(),
    target_type: model
      .enum(["product", "variant", "order", "custom"])
      .default("product"),
    target_id: model.text(),
    product_id: model.text().nullable(),
    variant_id: model.text().nullable(),
    label: model.text().nullable(),
    symbology: model.text().default("qr"),
    scan_action: model
      .enum(["view", "add_to_cart", "verify", "gs1_digital_link", "custom"])
      .default("view"),
    gs1_gtin: model.text().nullable(),
    batch_lot: model.text().nullable(),
    serial_number: model.text().nullable(),
    hmac_signature: model.text().nullable(),
    target_url: model.text().nullable(),
    svg_markup: model.text().nullable(),
    svg_url: model.text().nullable(),
    scan_count: model.number().default(0),
    last_scanned_at: model.dateTime().nullable(),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["code"], unique: true },
    { on: ["target_type", "target_id"] },
    { on: ["product_id"] },
    { on: ["variant_id"] },
  ])

/**
 * `BarcodeLabelTemplate` stores customizable thermal roll and A4 sheet label specifications.
 */
export const BarcodeLabelTemplate = model
  .define("barcode_label_template", {
    id: model.id().primaryKey(),
    name: model.text().searchable(),
    preset_id: model.text().default("thermal_50x25"),
    layout_type: model
      .enum(["thermal_roll", "a4_sheet"])
      .default("thermal_roll"),
    width_mm: model.number().default(50),
    height_mm: model.number().default(25),
    columns: model.number().default(1),
    rows: model.number().default(1),
    margin_top_mm: model.number().default(2),
    margin_left_mm: model.number().default(2),
    gap_x_mm: model.number().default(0),
    gap_y_mm: model.number().default(2),
    symbology: model.text().default("ean13"),
    show_title: model.boolean().default(true),
    show_variant_title: model.boolean().default(true),
    show_sku: model.boolean().default(true),
    show_price: model.boolean().default(true),
    show_compare_at_price: model.boolean().default(true),
    show_brand: model.boolean().default(false),
    show_qr: model.boolean().default(false),
    custom_header: model.text().nullable(),
    custom_footer: model.text().nullable(),
    dpi: model.number().default(203),
    is_default: model.boolean().default(false),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["preset_id"] }, { on: ["is_default"] }])

/**
 * `BarcodeCountSession` tracks warehouse physical inventory count & variance sessions.
 */
export const BarcodeCountSession = model
  .define("barcode_count_session", {
    id: model.id().primaryKey(),
    name: model.text().searchable(),
    location_id: model.text().nullable(),
    status: model
      .enum(["draft", "in_progress", "completed", "cancelled"])
      .default("in_progress"),
    notes: model.text().nullable(),
    total_expected: model.number().default(0),
    total_counted: model.number().default(0),
    total_variance: model.number().default(0),
    total_scans: model.number().default(0),
    created_by: model.text().nullable(),
    completed_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["status"] }, { on: ["location_id"] }])

/**
 * `BarcodeCountItem` stores per-SKU/barcode expected vs. counted quantities in a count session.
 */
export const BarcodeCountItem = model
  .define("barcode_count_item", {
    id: model.id().primaryKey(),
    session_id: model.text(),
    barcode: model.text().searchable(),
    variant_id: model.text().nullable(),
    product_id: model.text().nullable(),
    title: model.text(),
    variant_title: model.text().nullable(),
    sku: model.text().nullable(),
    expected_quantity: model.number().default(0),
    counted_quantity: model.number().default(0),
    variance: model.number().default(0),
    last_scanned_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    { on: ["session_id"] },
    { on: ["session_id", "barcode"], unique: true },
  ])

export const BarcodeModels = {
  BarcodeProduct,
  BarcodeCache,
  BarcodeTag,
  BarcodeLabelTemplate,
  BarcodeCountSession,
  BarcodeCountItem,
}
