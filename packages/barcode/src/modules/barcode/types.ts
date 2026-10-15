export const BARCODE_MODULE = "barcode"

export const BARCODE_TYPES = {
  EAN13: "ean13",
  EAN8: "ean8",
  UPCA: "upca",
  UPC_A: "upca",
  UPCE: "upce",
  UPC_E: "upce",
  GTIN14: "gtin14",
  ISBN13: "isbn13",
  CODE128: "code128",
  GS1_128: "gs1-128",
  CODE39: "code39",
  QR: "qr",
  DATAMATRIX: "datamatrix",
  UNKNOWN: "unknown",
} as const

export type BarcodeSymbology =
  | "ean13"
  | "ean8"
  | "upca"
  | "upce"
  | "gtin14"
  | "isbn13"
  | "code128"
  | "gs1-128"
  | "code39"
  | "qr"
  | "datamatrix"
  | "unknown"

export type BarcodeType = BarcodeSymbology

export type EnrichmentStrategy = "first-hit" | "deep-merge"
export type BarcodeLookupStrategy = EnrichmentStrategy

export type BarcodeScanAction =
  | "view"
  | "add_to_cart"
  | "verify"
  | "gs1_digital_link"
  | "custom"

export type BarcodeTagAction = BarcodeScanAction
export type BarcodeTagResourceType = "product" | "variant" | "order" | "custom"

export type LabelPresetId =
  | "thermal_50x25"
  | "thermal_57x32"
  | "thermal_100x50"
  | "jewelry_30x15"
  | "a4_24up_70x37"
  | "a4_40up_52x30"
  | "a4_65up_38x21"
  | "custom"

export interface Gs1ApplicationIdentifiers {
  gtin?: string
  ean13?: string
  batchLot?: string
  productionDate?: string
  bestBeforeDate?: string
  expiryDate?: string
  serialNumber?: string
  netWeightKg?: number
  quantity?: number
  rawAis: Record<string, string>
}

export type Gs1ParsedFields = Gs1ApplicationIdentifiers

export interface ParsedBarcode {
  raw: string
  normalized: string
  type: BarcodeSymbology
  isValid: boolean
  isIsbn: boolean
  checkDigit: number | null
  expectedCheckDigit: number | null
  ean13Equivalent: string | null
  expandedUpcA?: string | null
  gs1: Gs1ApplicationIdentifiers | null
  error?: string
}

export interface NormalizedBarcodeProduct {
  barcode: string
  barcode_type: BarcodeSymbology
  name: string
  description: string | null
  brand: string | null
  manufacturer: string | null
  categories: string[]
  images: string[]
  weight: number | null
  weight_unit: "g" | "kg" | "oz" | "lb" | null
  dimensions: string | null
  quantity_label: string | null
  ingredients: string | null
  nutrition: Record<string, unknown> | null
  country_of_origin: string | null
  suggested_price: number | null
  currency_code: string | null
  isbn: string | null
  authors: string[]
  publisher: string | null
  published_date: string | null
  page_count: number | null
  provider: string
  raw_data: Record<string, unknown>
}

export type NormalizedProduct = NormalizedBarcodeProduct

export interface ProviderConfig {
  enabled?: boolean
  priority?: number
  timeout?: number
  apiKey?: string
  baseUrl?: string
}

export interface BarcodeModuleOptions {
  cacheEnabled?: boolean
  cacheTtlSeconds?: number
  enrichmentStrategy?: EnrichmentStrategy
  autoGenerateVariantBarcode?: boolean
  internalBarcodePrefix?: string
  defaultProductStatus?: "draft" | "published"
  downloadProductImages?: boolean
  requestTimeoutMs?: number
  storefrontBaseUrl?: string
  hmacSecret?: string
  providers?: {
    openFoodFacts?: ProviderConfig
    openBeautyFacts?: ProviderConfig
    openPetFoodFacts?: ProviderConfig
    openProductsFacts?: ProviderConfig
    googleBooks?: ProviderConfig
    openLibrary?: ProviderConfig
    brocade?: ProviderConfig
    upcItemDb?: ProviderConfig
    eanSearch?: ProviderConfig
    barcodeLookup?: ProviderConfig
  }
}

export interface ProviderLookupOutcome {
  provider: string
  found: boolean
  durationMs: number
  product?: NormalizedBarcodeProduct | null
  error?: string
}

export interface BarcodeLookupChainResult {
  barcode: string
  parsed: ParsedBarcode
  found: boolean
  cached: boolean
  strategy: EnrichmentStrategy
  product: NormalizedBarcodeProduct | null
  outcomes: ProviderLookupOutcome[]
}

export interface RenderBarcodeSvgOptions {
  code: string
  symbology?: BarcodeSymbology
  width?: number
  height?: number
  includeText?: boolean
  darkColor?: string
  lightColor?: string
  quietZone?: number
  title?: string
}

export interface LabelTemplateSpec {
  id: string
  name: string
  preset_id: LabelPresetId
  layout_type: "thermal_roll" | "a4_sheet"
  width_mm: number
  height_mm: number
  columns: number
  rows: number
  margin_top_mm: number
  margin_left_mm: number
  gap_x_mm: number
  gap_y_mm: number
  symbology: BarcodeSymbology
  show_title: boolean
  show_variant_title: boolean
  show_sku: boolean
  show_price: boolean
  show_compare_at_price: boolean
  show_brand: boolean
  show_qr: boolean
  custom_header: string | null
  custom_footer: string | null
  dpi: 203 | 300
  is_default: boolean
}

export interface LabelPrintItem {
  barcode: string
  symbology?: BarcodeSymbology
  title: string
  variant_title?: string | null
  sku?: string | null
  brand?: string | null
  price?: number | null
  compare_at_price?: number | null
  currency_code?: string
  qr_url?: string | null
  quantity?: number
}

export interface LabelPrintOutput {
  template: LabelTemplateSpec
  total_labels: number
  html: string
  zpl: string
  items: LabelPrintItem[]
}

export interface CreateProductPayload {
  title: string
  subtitle?: string | null
  description?: string | null
  handle: string
  status: "draft" | "published"
  thumbnail?: string | null
  images: Array<{ url: string }>
  weight?: number | null
  origin_country?: string | null
  options: Array<{ title: string; values: string[] }>
  variants: Array<{
    title: string
    sku: string
    barcode: string
    ean: string | null
    upc: string | null
    manage_inventory: boolean
    options: Record<string, string>
    prices: Array<{ amount: number; currency_code: string }>
  }>
  metadata: Record<string, unknown>
}
