# Modules

The `barcode` module (`BARCODE_MODULE = "barcode"`) implements the data layer, 10-provider GTIN/ISBN lookup chain, GS1 parser, pure SVG renderer, thermal/A4 label printing engine, and anti-counterfeit HMAC security utilities for `medusa-plugin-barcode`.

```sh
modules/
└── barcode/
    ├── index.ts                      exports BARCODE_MODULE ("barcode") + Module() definition
    ├── types.ts                      DTOs, plugin options, symbologies, provider & label types
    ├── service.ts                    BarcodeModuleService (alias: BarcodeService) extending MedusaService
    ├── models/
    │   └── index.ts                  6 DML models (Product, Cache, Tag, Template, Session, Item)
    ├── providers/
    │   └── index.ts                  BaseBarcodeProvider, ProviderRegistry & 10 lookup providers
    └── utils/
        ├── barcode-parser.ts         Right-to-left GS1 Modulo-10, UPC-E, GS1-128 AI & Digital Link
        ├── normalize-product.ts      mergeNormalizedProducts & mapToMedusaCreateProduct
        ├── svg-renderer.ts           Zero-dependency 1D/2D vector SVG barcode & QR/DataMatrix renderer
        ├── label-printer.ts          7 thermal/A4 presets, HTML+SVG sheet & Zebra ZPL II generator
        └── security.ts               HMAC-SHA256 signer/verifier, SSRF guard & escapeHtml
```

---

## Data models (`src/modules/barcode/models/index.ts`)

All 6 models are defined with Medusa v2's DML (`model.define`) and registered on `BarcodeModuleService`:

| Model | Table Name | Key Fields | Purpose |
| --- | --- | --- | --- |
| `BarcodeProduct` | `barcode_product` | `barcode` (unique), `barcode_type`, `product_id`, `variant_id`, `provider`, `product_data`, `status` (`created` \| `linked` \| `updated`), `last_synced_at` | Links a GTIN/ISBN barcode to a Medusa `Product` and `ProductVariant` alongside normalized provider metadata |
| `BarcodeCache` | `barcode_cache` | `barcode` (unique), `barcode_type`, `provider`, `found`, `response_data`, `expires_at` (indexed), `hit_count` | Caches external provider lookup responses with TTL expiration and hit tracking |
| `BarcodeTag` | `barcode_tag` | `code` (unique), `target_type` (`product` \| `variant` \| `order` \| `custom`), `target_id`, `product_id`, `variant_id`, `symbology`, `scan_action` (`view` \| `add_to_cart` \| `verify` \| `gs1_digital_link` \| `custom`), `gs1_gtin`, `batch_lot`, `serial_number`, `hmac_signature`, `svg_markup`, `svg_url`, `scan_count`, `last_scanned_at`, `is_active` | Stores generated 1D/2D barcodes and dynamic QR tags with GS1 attributes, scan analytics, and anti-counterfeit `HMAC-SHA256` seals |
| `BarcodeLabelTemplate` | `barcode_label_template` | `name`, `preset_id`, `layout_type` (`thermal_roll` \| `a4_sheet`), `width_mm`, `height_mm`, `columns`, `rows`, `margin_top_mm`, `margin_left_mm`, `gap_x_mm`, `gap_y_mm`, `symbology`, `show_title`, `show_variant_title`, `show_sku`, `show_price`, `show_compare_at_price`, `show_brand`, `show_qr`, `custom_header`, `custom_footer`, `dpi`, `is_default` | Persists customizable thermal roll and A4 sheet label layout templates |
| `BarcodeCountSession` | `barcode_count_session` | `name`, `location_id`, `status` (`draft` \| `in_progress` \| `completed` \| `cancelled`), `notes`, `total_expected`, `total_counted`, `total_variance`, `total_scans`, `completed_at` | Tracks warehouse physical inventory stock-take audit sessions |
| `BarcodeCountItem` | `barcode_count_item` | `session_id`, `barcode` (unique per session), `variant_id`, `product_id`, `title`, `variant_title`, `sku`, `expected_quantity`, `counted_quantity`, `variance`, `last_scanned_at` | Tracks per-SKU/barcode expected vs. counted quantities and variance inside a `BarcodeCountSession` |

---

## Service (`BarcodeModuleService` / `BarcodeService`)

**Service token:** `BARCODE_MODULE = "barcode"`

`BarcodeModuleService` extends `MedusaService(BarcodeModels)`. Every public method is `async` and throws `MedusaError` from `@medusajs/framework/utils` on invalid input or missing entities.

| Method | Description |
| --- | --- |
| `getModuleOptions()` | Returns resolved `BarcodeModuleOptions` merged with defaults |
| `getProviderRegistry()` | Returns the active `ProviderRegistry` with all configured lookup providers |
| `lookupBarcode(rawBarcode, options?)` | Validates/normalizes a GTIN/ISBN, checks `BarcodeCache`, queries the 10-provider chain (`first-hit` or `deep-merge`), and caches the result |
| `upsertBarcodeProductLink(data)` | Creates or updates a `BarcodeProduct` mapping between a barcode and a Medusa `product_id` / `variant_id` |
| `generateInternalVariantBarcode(input)` | Generates a deterministic or sequential GS1 in-store (`200`–`299`) 13-digit EAN-13 barcode with valid check digit |
| `createOrUpdateBarcodeTag(input)` | Renders 1D/2D SVG markup, computes an `HMAC-SHA256` signature (`signAuthenticityHmac`), builds the target/GS1 Digital Link URL, and upserts `BarcodeTag` |
| `resolveStoreScan(code)` | Resolves a scanned barcode or QR tag on the storefront, increments `scan_count`, updates `last_scanned_at`, and returns the scan action + target URL |
| `verifyTagAuthenticity(code, signature)` | Verifies a tag's anti-counterfeit `HMAC-SHA256` seal in constant time (`crypto.timingSafeEqual`) |
| `listAllLabelTemplates()` | Returns the 7 built-in presets (`BUILTIN_LABEL_TEMPLATES`) plus custom `BarcodeLabelTemplate` rows |
| `printLabels(items, templateIdOrSpec?)` | Renders both a print-ready HTML+SVG document (`html`) and raw Zebra ZPL II commands (`zpl`) |
| `startCountSession(input)` | Creates a `BarcodeCountSession` and optional initial `BarcodeCountItem` rows |
| `recordCountSessionScan(input)` | Records a `+1`, `-1`, or `set_quantity` barcode scan inside an active session and recalculates item & session variance |
| `completeCountSession(sessionId)` | Marks a count session as `"completed"` and returns all line items for inventory reconciliation |
| `purgeExpiredCache()` / `clearAllCache()` | Deletes expired or all rows from `barcode_cache` |

---

## Utilities (`src/modules/barcode/utils/`)

| File | Key Exports | Responsibility |
| --- | --- | --- |
| `barcode-parser.ts` | `computeGs1CheckDigit`, `validateGs1Checksum`, `expandUpcEToUpcA`, `upcToEan13`, `parseGs1ApplicationIdentifiers`, `buildGs1DigitalLink`, `generateGs1InStoreEan13`, `parseBarcode` | Spec-compliant right-to-left `3,1,3,1` GS1 Modulo-10 checksum math across `EAN-8`, `UPC-E`, `UPC-A`, `EAN-13`, `ISBN-13`, and `GTIN-14`, plus GS1-128 Application Identifiers (`(01)`, `(10)`, `(11)`, `(15)`, `(17)`, `(21)`, `(30)`, `(37)`, `(310n)`) and GS1 Digital Link URIs |
| `normalize-product.ts` | `mergeNormalizedProducts`, `mapToMedusaCreateProduct` | Deep-merges partial `NormalizedBarcodeProduct` results across multiple providers and maps them to Medusa v2 `createProducts` payloads |
| `svg-renderer.ts` | `renderBarcodeSvg` | Pure TypeScript vector SVG generator for 1D (`ean13`, `isbn13`, `upca`, `upce`, `ean8`, `gtin14`, `code128`, `gs1-128`, `code39`) and 2D (`qr`, `datamatrix`) symbologies |
| `label-printer.ts` | `BUILTIN_LABEL_TEMPLATES`, `getLabelTemplateById`, `formatLabelPrice`, `renderPrintableLabels` | 7 thermal roll (`50×25`, `57×32`, `100×50`, `30×15` Jewelry) & A4 sheet (`24`/`40`/`65`-up) presets, multi-currency price formatting, HTML+SVG `@page` generator, and native `203`/`300 DPI` Zebra ZPL II (`^XA...^XZ`) generator |
| `security.ts` | `escapeHtml`, `validateExternalImageUrl`, `signAuthenticityHmac`, `verifyAuthenticityHmac` | XSS escaping for SVG/HTML labels, SSRF guard blocking private/loopback/metadata IPs on external image fetches, and constant-time `HMAC-SHA256` signature generation/verification |

---

## Generating migrations

After editing a model in `models/index.ts`, regenerate migrations from the plugin root:

```bash
npx medusa plugin:db:generate
```

Migration files are applied in the host application via `npx medusa db:migrate`.
