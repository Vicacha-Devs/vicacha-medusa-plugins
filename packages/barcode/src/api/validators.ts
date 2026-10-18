import { z } from "@medusajs/framework/zod"

export const BarcodeSymbologySchema = z.enum([
  "ean13",
  "ean8",
  "upca",
  "upce",
  "gtin14",
  "isbn13",
  "code128",
  "gs1-128",
  "code39",
  "qr",
  "datamatrix",
  "unknown",
])

export const BarcodeScanActionSchema = z.enum([
  "view",
  "add_to_cart",
  "verify",
  "gs1_digital_link",
  "custom",
])

export const EnrichmentStrategySchema = z.enum(["first-hit", "deep-merge"])

export const LookupBarcodeBodySchema = z.object({
  barcode: z.string().min(1).max(128),
  skipCache: z.boolean().optional(),
  strategy: EnrichmentStrategySchema.optional(),
  providers: z.array(z.string().min(1).max(64)).max(10).optional(),
})

export const VariantPriceInputSchema = z.object({
  amount: z.number().min(0),
  currency_code: z.string().min(1).max(8),
})

export const CreateFromBarcodeBodySchema = z.object({
  barcode: z.string().min(1).max(128),
  status: z.enum(["draft", "published"]).optional(),
  publishImmediately: z.boolean().optional(),
  strategy: EnrichmentStrategySchema.optional(),
  skipCache: z.boolean().optional(),
  skipExistingCheck: z.boolean().optional(),
  downloadImages: z.boolean().optional(),
  overrideTitle: z.string().max(256).optional(),
  overrideDescription: z.string().max(4000).optional(),
  overridePrice: z.number().min(0).optional(),
  currencyCode: z.string().max(8).optional(),
  skuPrefix: z.string().max(32).optional(),
  prices: z.array(VariantPriceInputSchema).max(50).optional(),
  salesChannelIds: z.array(z.string().min(1).max(128)).max(50).optional(),
  categoryIds: z.array(z.string().min(1).max(128)).max(50).optional(),
  collectionId: z.string().max(128).nullable().optional(),
})

export const BatchBarcodeImportBodySchema = z.object({
  barcodes: z.array(z.string().min(1).max(128)).min(1).max(100),
  status: z.enum(["draft", "published"]).optional(),
  publishImmediately: z.boolean().optional(),
  strategy: EnrichmentStrategySchema.optional(),
  createMissingAsDraft: z.boolean().optional(),
  prices: z.array(VariantPriceInputSchema).max(50).optional(),
  salesChannelIds: z.array(z.string().min(1).max(128)).max(50).optional(),
  categoryIds: z.array(z.string().min(1).max(128)).max(50).optional(),
  collectionId: z.string().max(128).nullable().optional(),
})

export const BulkGenerateBarcodesBodySchema = z.object({
  variant_ids: z.array(z.string().min(1).max(128)).max(250).optional(),
  product_ids: z.array(z.string().min(1).max(128)).max(250).optional(),
  prefix: z.string().regex(/^2\d{2}$/).optional(),
  overwrite: z.boolean().optional(),
})

export const QuickScanAdjustBodySchema = z.object({
  barcode: z.string().min(1).max(128),
  action: z.enum(["lookup", "increment", "decrement", "set"]).optional(),
  quantity: z.number().int().optional(),
  location_id: z.string().max(128).nullable().optional(),
})

export const CreateBarcodeTagBodySchema = z.object({
  code: z.string().max(128).optional(),
  target_type: z.enum(["product", "variant", "order", "custom"]).optional(),
  target_id: z.string().min(1).max(256),
  product_id: z.string().max(256).nullable().optional(),
  variant_id: z.string().max(256).nullable().optional(),
  label: z.string().max(256).nullable().optional(),
  symbology: BarcodeSymbologySchema.optional(),
  scan_action: BarcodeScanActionSchema.optional(),
  gs1_gtin: z.string().max(64).nullable().optional(),
  batch_lot: z.string().max(64).nullable().optional(),
  serial_number: z.string().max(128).nullable().optional(),
  target_url: z.string().max(1024).nullable().optional(),
  upload_svg_to_file_module: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateBarcodeTagBodySchema = CreateBarcodeTagBodySchema.partial()

export const CreateLabelTemplateBodySchema = z.object({
  name: z.string().min(1).max(160),
  preset_id: z.string().max(64).optional(),
  layout_type: z.enum(["thermal_roll", "a4_sheet"]).optional(),
  width_mm: z.number().min(10).max(300),
  height_mm: z.number().min(10).max(300),
  columns: z.number().int().min(1).max(10).optional(),
  rows: z.number().int().min(1).max(30).optional(),
  margin_top_mm: z.number().min(0).max(50).optional(),
  margin_left_mm: z.number().min(0).max(50).optional(),
  gap_x_mm: z.number().min(0).max(30).optional(),
  gap_y_mm: z.number().min(0).max(30).optional(),
  symbology: BarcodeSymbologySchema.optional(),
  show_title: z.boolean().optional(),
  show_variant_title: z.boolean().optional(),
  show_sku: z.boolean().optional(),
  show_price: z.boolean().optional(),
  show_compare_at_price: z.boolean().optional(),
  show_brand: z.boolean().optional(),
  show_qr: z.boolean().optional(),
  custom_header: z.string().max(120).nullable().optional(),
  custom_footer: z.string().max(120).nullable().optional(),
  dpi: z.enum(["203", "300"]).or(z.number().int()).optional(),
  is_default: z.boolean().optional(),
})

export const PrintLabelsBodySchema = z.object({
  template_id: z.string().max(128).optional(),
  items: z
    .array(
      z.object({
        barcode: z.string().min(1).max(128),
        symbology: BarcodeSymbologySchema.optional(),
        title: z.string().min(1).max(256),
        variant_title: z.string().max(256).nullable().optional(),
        sku: z.string().max(128).nullable().optional(),
        brand: z.string().max(128).nullable().optional(),
        price: z.number().nullable().optional(),
        compare_at_price: z.number().nullable().optional(),
        currency_code: z.string().max(8).optional(),
        qr_url: z.string().max(1024).nullable().optional(),
        quantity: z.number().int().min(1).max(200).optional(),
      })
    )
    .min(1)
    .max(200),
})

export const CreateCountSessionBodySchema = z.object({
  name: z.string().min(1).max(180),
  location_id: z.string().max(128).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  expected_items: z
    .array(
      z.object({
        barcode: z.string().min(1).max(128),
        variant_id: z.string().max(128).nullable().optional(),
        product_id: z.string().max(128).nullable().optional(),
        title: z.string().min(1).max(256),
        variant_title: z.string().max(256).nullable().optional(),
        sku: z.string().max(128).nullable().optional(),
        expected_quantity: z.number().int().min(0),
      })
    )
    .max(500)
    .optional(),
})

export const RecordCountScanBodySchema = z.object({
  barcode: z.string().min(1).max(128),
  delta: z.number().int().optional(),
  set_quantity: z.number().int().min(0).optional(),
  variant_id: z.string().max(128).nullable().optional(),
  product_id: z.string().max(128).nullable().optional(),
  title: z.string().max(256).optional(),
  variant_title: z.string().max(256).nullable().optional(),
  sku: z.string().max(128).nullable().optional(),
  expected_quantity: z.number().int().min(0).optional(),
})

export const ApplyCountSessionBodySchema = z.object({
  location_id: z.string().max(128).nullable().optional(),
})

export const VerifyStoreBarcodeBodySchema = z.object({
  signature: z.string().min(1).max(256),
})

export type LookupBarcodeBody = z.infer<typeof LookupBarcodeBodySchema>
export type CreateFromBarcodeBody = z.infer<typeof CreateFromBarcodeBodySchema>
export type BatchBarcodeImportBody = z.infer<
  typeof BatchBarcodeImportBodySchema
>
export type BulkGenerateBarcodesBody = z.infer<
  typeof BulkGenerateBarcodesBodySchema
>
export type QuickScanAdjustBody = z.infer<typeof QuickScanAdjustBodySchema>
export type CreateBarcodeTagBody = z.infer<typeof CreateBarcodeTagBodySchema>
export type UpdateBarcodeTagBody = z.infer<typeof UpdateBarcodeTagBodySchema>
export type CreateLabelTemplateBody = z.infer<
  typeof CreateLabelTemplateBodySchema
>
export type PrintLabelsBody = z.infer<typeof PrintLabelsBodySchema>
export type CreateCountSessionBody = z.infer<
  typeof CreateCountSessionBodySchema
>
export type RecordCountScanBody = z.infer<typeof RecordCountScanBodySchema>
export type ApplyCountSessionBody = z.infer<typeof ApplyCountSessionBodySchema>
export type VerifyStoreBarcodeBody = z.infer<
  typeof VerifyStoreBarcodeBodySchema
>
