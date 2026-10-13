# `medusa-plugin-documents`

Enterprise-grade commercial document generation and accounting management plugin for **Medusa v2** (`>= 2.13.x`).

Generates **Invoices**, **Packing Slips**, **Credit Notes**, and **80mm / 58mm POS Thermal Receipts** using a zero-Chromium **Dual PDF Engine** (`@react-pdf/renderer` + `Handlebars/pdfmake`), backed by immutable Medusa File Module storage, per-region settings overrides, 10-locale PDF & Admin UI i18n (with RTL Arabic support), Notification Module email attachments, bulk ZIP/CSV exports, and **strictly optional B2B & Docuseal e-signature integrations**.

---

## Table of Contents

1. [Features Overview](#1-features-overview)
2. [Installation & Quick Start](#2-installation--quick-start)
3. [Plugin Options (`medusa-config.ts`)](#3-plugin-options-medusa-configts)
4. [Document Types & Lifecycle Events](#4-document-types--lifecycle-events)
5. [Dual PDF Rendering Engine & Templates](#5-dual-pdf-rendering-engine--templates)
6. [Custom Numbering & Per-Type Sequences](#6-custom-numbering--per-type-sequences)
7. [Multi-Language Support (i18n)](#7-multi-language-support-i18n)
8. [Per-Region Settings Overrides](#8-per-region-settings-overrides)
9. [Optional B2B Plugin & Metadata Integration](#9-optional-b2b-plugin--metadata-integration)
10. [Optional Docuseal E-Signature Integration](#10-optional-docuseal-e-signature-integration)
11. [Email Delivery via Notification Module](#11-email-delivery-via-notification-module)
12. [Admin UI Extensions](#12-admin-ui-extensions)
13. [REST API Reference (Admin & Storefront)](#13-rest-api-reference-admin--storefront)
14. [Database Schema (`mpd_` Prefix)](#14-database-schema-mpd_-prefix)
15. [Development & Testing](#15-development--testing)

---

## 1. Features Overview

| Capability | Description |
|---|---|
| **4 First-Class Document Types** | `invoice`, `packing_slip`, `credit_note`, and `receipt` (POS thermal), each with its own numbering sequence, template preset, auto-generation toggle, and auto-email toggle. |
| **Dual PDF Engine (Zero Chromium)** | **Engine A (`@react-pdf/renderer`)** for type-safe React presets (`clean`, `classic`, `compact`, `packing_slip`, `credit_note`, `pos_80mm`, `pos_58mm`) + TipTap rich-text notes; **Engine B (`Handlebars + pdfmake`)** for custom HTML templates with visual style & section toggles. |
| **Immutable Snapshots & Versioning** | Every generated PDF is uploaded to Medusa's File Module (`Modules.FILE`) alongside an immutable `settings_snapshot` and `render_context_snapshot`. Order edits flag existing invoices as `is_stale`, allowing admins to issue versioned revisions (`v2`, `v3`) while preserving `prior_versions` in the audit trail. |
| **Per-Region Settings** | Configure regional legal entities, tax IDs, logos, currencies, locales, and numbering sequences per Medusa Region (`region_id`) with automatic fallback to the Global Default (`region_id = null`). |
| **10 Built-in Locales (PDF + Admin UI)** | Ships with `en`, `es`, `pl`, `de`, `fr`, `pt`, `it`, `nl`, `tr`, and `ar` dictionaries for both rendered PDFs and the Medusa Admin UI (`react-i18next` with RTL support for Arabic), plus custom merchant translation overrides (`custom_translations`). |
| **Optional B2B Integration** | Works 100% standalone for B2C stores. If an optional B2B module is registered in the Medusa container or B2B metadata (`tax_id`, `vat_number`, `po_number`, `payment_terms`) is present on the order/customer, documents automatically include buyer B2B details. |
| **Optional Docuseal E-Signatures** | Supports Docuseal Cloud and self-hosted instances. Zero-config direct PDF signing (`POST /submissions/pdf`) or template-based signing (`POST /submissions`), HMAC-verified webhooks (`X-Docuseal-Signature`), and storefront signing embeds. |
| **Bulk Operations & Accounting CSV** | Batch-generate documents across multiple orders, download multi-document `.zip` archives, and export formula-injection-safe `.csv` ledgers. |

---

## 2. Installation & Quick Start

### 1. Install the package

```bash
npm install medusa-plugin-documents
# or
yarn add medusa-plugin-documents
# or
pnpm add medusa-plugin-documents
```

### 2. Register in `medusa-config.ts`

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  projectConfig: {
    // ...
  },
  plugins: [
    {
      resolve: "medusa-plugin-documents",
      options: {},
    },
  ],
})
```

### 3. Run database migrations

```bash
npx medusa db:migrate
```

---

## 3. Plugin Options (`medusa-config.ts`)

Both `b2b` and `docuseal` are **strictly optional**. You can omit `options` entirely for a standard B2C store.

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "medusa-plugin-documents",
      options: {
        // Optional B2B integration (zero hard dependency on any B2B plugin)
        b2b: {
          enabled: true, // Set to false to disable all B2B lookups & metadata extraction
          module_key: "company", // Optional container key if a B2B/Company module is installed
          company_field_mappings: {
            tax_id: "tax_id",
            vat_number: "vat_number",
            po_number: "po_number",
            payment_terms: "payment_terms",
            registration_number: "registration_number",
          },
        },

        // Optional Docuseal E-Signature integration (Cloud or Self-Hosted)
        docuseal: {
          api_key: process.env.DOCUSEAL_API_KEY,
          webhook_secret: process.env.DOCUSEAL_WEBHOOK_SECRET,
          base_url: process.env.DOCUSEAL_BASE_URL || "https://api.docuseal.com",
        },
      },
    },
  ],
})
```

---

## 4. Document Types & Lifecycle Events

| Document Type | Default Prefix | Subscriber Event(s) | Auto-Gen Setting | Description |
|---|---|---|---|---|
| `invoice` | `INV` | `order.placed` | `auto_generate_invoice` (`true`) | Commercial tax invoice with line items, taxes, discounts, shipping, notes, and bank details. |
| `packing_slip` | `PS` | `order.fulfillment_created`, `shipment.created` | `auto_generate_packing_slip` (`false`) | Warehouse dispatch & delivery slip showing SKUs, variants, quantities, weights, carrier, and tracking numbers. **Strictly omits all prices.** |
| `credit_note` | `CN` | `order.refund_created`, `payment.refunded` | `auto_generate_credit_note` (`true`) | Accounting credit note with negative line items and totals, linked to the original invoice via `related_document_id` and displaying the refund reason. |
| `receipt` | `RCP` | `order.placed` | `auto_generate_receipt` (`false`) | Point-of-Sale (POS) thermal receipt sized for `80mm` or `58mm` roll printers with dynamic height calculation based on line item count. |

### Order Mutation & Stale Detection
- `order.updated` & `order.edit_confirmed`: Marks existing generated `invoice` and `receipt` documents for the order as `is_stale = true` with a descriptive `stale_reason`.
- `order.canceled`: Marks existing generated documents as `is_stale = true` (`"Order was canceled"`).
- Admins can click **Issue v2** on the Order Documents Widget to generate a new versioned revision while preserving all prior PDFs in `prior_versions` and `audit_log`.

---

## 5. Dual PDF Rendering Engine & Templates

### Engine A: Built-in `@react-pdf/renderer` Presets
Fast, serverless-friendly React PDF components with TipTap rich-text notes support (`src/modules/documents/renderer/react-pdf/`):
- `clean`: Modern minimalist layout with brand accent bar, structured metadata, optional B2B badge box, and optional signature block.
- `classic`: Executive bordered layout with framed header and grid cells.
- `compact`: High-density wholesale/B2B layout engineered for orders with 50–100+ line items.
- `packing_slip`: Fulfillment-focused layout without prices.
- `credit_note`: Crimson-accented credit note layout referencing the original invoice number and refund reason.
- `pos_80mm` / `pos_58mm`: Thermal receipt roll layouts (`226.77pt` and `164.41pt` width) with automatic height calculation.

### Engine B: Custom `Handlebars + pdfmake` Templates (`mpd_document_template`)
Merchants can create custom HTML/Handlebars templates via `/admin/documents/templates` with:
- **Page Sizes**: `A4`, `LETTER`, `80MM`, `58MM`
- **Orientations**: `portrait`, `landscape`
- **Handlebars Variables**:
  - `{{document_number}}`, `{{document_type}}`, `{{version}}`, `{{formatted_issue_date}}`, `{{formatted_order_date}}`
  - `{{order.*}}` (`display_id`, `currency_code`, `email`, `payment_method`)
  - `{{settings.*}}` (`company_name`, `company_address`, `company_tax_id`, `company_logo`, `notes`, `bank_details`, `footer_text`)
  - `{{b2b.*}}` (`is_b2b`, `company_name`, `tax_id`, `vat_number`, `po_number`, `payment_terms`, `cost_center`)
  - `{{#each formatted_items}}` (`title`, `sku`, `variant_title`, `quantity`, `unit_price_formatted`, `tax_total_formatted`, `total_formatted`)
  - `{{formatted_totals.*}}` (`subtotal`, `discount_total`, `shipping_total`, `tax_total`, `total`)
  - `{{t.*}}` (localized labels for the active document locale)

---

## 6. Custom Numbering & Per-Type Sequences

Each document type (`invoice`, `packing_slip`, `credit_note`, `receipt`) maintains its own independent sequence in `mpd_document_settings`:

| Token | Output Example | Description |
|---|---|---|
| `{prefix}` | `INV` | Configured prefix for the document type |
| `{year}` | `2026` | 4-digit UTC year |
| `{short_year}` | `26` | 2-digit UTC year |
| `{month}` | `10` | Zero-padded 2-digit UTC month (`01`–`12`) |
| `{day}` | `09` | Zero-padded 2-digit UTC day (`01`–`31`) |
| `{number}` | `00042` | Sequential counter padded to `{type}_number_padding` (default `5`) |
| `{order_display_id}` | `1042` | Medusa order `display_id` |

### `forced_next_number`
Setting `invoice_forced_next_number: 500` (or the equivalent field for `packing_slip`, `credit_note`, or `receipt`) forces the very next generated document of that type to use sequence number `500`, automatically resets `forced_next_number` to `null`, and increments `next_invoice_number` to `501`.

---

## 7. Multi-Language Support (i18n)

### Built-in Locales (PDF Generation & Admin UI)
Both the backend PDF generator (`src/modules/documents/i18n/locales/all-locales.ts`) and the Medusa Admin UI (`src/admin/i18n/index.ts` via `react-i18next`) support **10 built-in languages**, including automatic **RTL (`dir="rtl"`)** layout in the Admin UI when Arabic (`ar`) is selected:

| Code | Language | Invoice Title | Packing Slip Title | Credit Note Title |
|---|---|---|---|---|
| `en` | English | `INVOICE` | `PACKING SLIP` | `CREDIT NOTE` |
| `es` | Spanish | `FACTURA` | `ALBARÁN DE ENTREGA` | `NOTA DE CRÉDITO` |
| `pl` | Polish | `FAKTURA` | `SPECYFIKACJA WYSYŁKOWA` | `FAKTURA KORYGUJĄCA` |
| `de` | German | `RECHNUNG` | `LIEFERSCHEIN` | `GUTSCHRIFT` |
| `fr` | French | `FACTURE` | `BON DE LIVRAISON` | `AVOIR` |
| `pt` | Portuguese | `FATURA` | `GUIA DE REMESSA` | `NOTA DE CRÉDITO` |
| `it` | Italian | `FATTURA` | `DOCUMENTO DI TRASPORTO` | `NOTA DI CREDITO` |
| `nl` | Dutch | `FACTUUR` | `PAKBON` | `CREDITNOTA` |
| `tr` | Turkish | `FATURA` | `SEVK İRSALİYESİ` | `İADE FATURASI / ALACAK DEKONTU` |
| `ar` | Arabic (RTL) | `فاتورة ضريبية` | `إشعار تسليم / تعبئة` | `إشعار دائن` |

### Custom Translation Overrides
Override any label per locale via `PUT /admin/documents/settings`:

```json
{
  "default_locale": "es",
  "custom_translations": {
    "es": {
      "invoice_title": "FACTURA COMERCIAL",
      "tax_id": "RFC / NIF"
    }
  }
}
```

---

## 8. Per-Region Settings Overrides

By default, all orders use the **Global Default** settings (`region_id = null`).
To configure a separate legal entity, tax ID, currency/locale, or numbering sequence for a specific Medusa Region:

1. In Admin UI (`/app/documents/settings`), select the target Region from the **Region Scope** dropdown and click **Save Settings**.
2. Via API: `PUT /admin/documents/settings?region_id=reg_01J...`
3. To remove a regional override and revert to Global Default: `DELETE /admin/documents/settings?region_id=reg_01J...`

---

## 9. Optional B2B Plugin & Metadata Integration

`medusa-plugin-documents` has **zero hard dependencies** on any B2B plugin. It resolves buyer B2B details using a 3-tier strategy:

1. **Tier 1 — Optional B2B Module in Container**: If `options.b2b?.enabled` is `true` and a B2B/Company service (`company`, `companyModuleService`, `b2b`, or `options.b2b.module_key`) is registered in the Medusa container, the plugin resolves the buyer's `Company` record using `order.metadata.company_id` or `customer.metadata.company_id`.
2. **Tier 2 — Standard Medusa Metadata & Address Fallback**: Works without any B2B plugin installed by reading standard fields on the order, customer, or billing address:
   - `order.billing_address.company` / `order.metadata.company_name` / `customer.company_name`
   - `order.metadata.tax_id` / `customer.metadata.tax_id`
   - `order.metadata.vat_number` / `customer.metadata.vat_number`
   - `order.metadata.po_number` / `order.metadata.purchase_order_number`
   - `order.metadata.payment_terms` / `customer.metadata.payment_terms`
   - `order.metadata.cost_center`
3. **Tier 3 — Pure B2C Mode**: If no B2B fields are present (or `options.b2b.enabled === false`), B2B sections are omitted from rendered PDFs.

---

## 10. Optional Docuseal E-Signature Integration

When `DOCUSEAL_API_KEY` (or `options.docuseal.api_key`) is provided:

1. **Zero-Config Direct PDF Signing (`/submissions/pdf`)**:
   - Calling `POST /admin/documents/:id/send-for-signature` sends the generated PDF directly to Docuseal's `/submissions/pdf` endpoint with embedded signature placement. No pre-existing Docuseal template is required.
   - Optionally, set `docuseal_template_id` in settings to use `POST /submissions` with a fixed Docuseal template.
2. **Webhook Verification (`POST /admin/documents/webhooks/docuseal`)**:
   - Configure your Docuseal webhook URL to `https://your-medusa-domain.com/admin/documents/webhooks/docuseal` with secret `DOCUSEAL_WEBHOOK_SECRET`.
   - The plugin verifies `X-Docuseal-Signature` using constant-time HMAC-SHA256 (`crypto.timingSafeEqual`).
   - On `submission.completed`, the plugin validates the document URL against SSRF rules, downloads the countersigned PDF, uploads it to Medusa's File Module, and updates `mpd_signature_request`.
3. **Storefront Signing Embed & Download**:
   - `GET /store/documents/:order_id/signing-url` returns `{ embed_src, status }` for embedding `<DocusealForm src={embed_src} />` in your storefront.
   - `GET /store/documents/:order_id/signed.pdf` streams the completed countersigned PDF to the authenticated customer.

---

## 11. Email Delivery via Notification Module

When a document is generated, `generateDocumentWorkflow` emits the `"document.generated"` event.
The subscriber (`src/subscribers/document-generated-email.ts`) checks `auto_email_{document_type}` in the resolved settings (or can be triggered manually via `POST /admin/documents/:id/send-email`) and calls `Modules.NOTIFICATION`:

- **Channel**: `"email"`
- **Template Names**:
  - `document-invoice`
  - `document-packing-slip`
  - `document-credit-note`
  - `document-receipt`
- **Attachment**: `{ filename, content: "<base64-pdf>", content_type: "application/pdf" }`

---

## 12. Admin UI Extensions (Localized in 10 Languages + RTL)

1. **Order Detail Widget (`src/admin/widgets/order-documents-widget.tsx`)**:
   - Injected into `order.details.side.after`.
   - Generate any of the 4 document types with a per-generation 10-locale selector (`en`, `es`, `pl`, `de`, `fr`, `pt`, `it`, `nl`, `tr`, `ar`).
   - Displays **Stale Warning Banner** when an order is modified after invoice generation, with a one-click **Issue v2** button.
   - View PDF, Email PDF, Retry Failed Generation, Send for Signature (when Docuseal is configured), and inspect the **Audit Log & Prior Versions Timeline**.
2. **Commercial Documents Hub (`/app/documents`)**:
   - Interactive 10-language UI switcher (`SUPPORTED_UI_LOCALES`) with automatic `dir="rtl"` for Arabic.
   - Filter and search across all generated documents by type, status, date range, or document/order number.
   - Select multiple documents to **Download Selected ZIP** or click **Export CSV** for accounting software import.
   - **Bulk Document Generation** panel for batch-generating documents across multiple Order IDs.
3. **Settings & Template Studio (`/app/documents/settings`)**:
   - Per-region settings override selector (`Global Default` vs. individual Medusa Regions).
   - Company identity, branding colors, TipTap/HTML notes, numbering format builder with live preview badge, automation/email toggles, and an interactive **Live PDF Preview** supporting Mock Orders, **75-Item Stress Tests**, and **Real Order IDs** (`?order_id=...`).

---

## 13. REST API Reference (Admin & Storefront)

### Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/documents` | List documents (`?order_id=`, `?document_type=`, `?status=`, `?is_stale=`, `?q=`, `?date_from=`, `?date_to=`, `?limit=`, `?offset=`) |
| `POST` | `/admin/documents` | Generate a document (`{ order_id, document_type, template_id?, locale?, fulfillment_id?, refund_id? }`) |
| `GET` | `/admin/documents/:id` | Retrieve document details, `audit_log`, `prior_versions`, `signature_requests`, and `related_children` |
| `DELETE` | `/admin/documents/:id` | Delete a draft/failed document (generated invoices & credit notes are protected) |
| `GET` | `/admin/documents/:id/pdf` | Stream PDF (`?signed=true` for countersigned PDF, `?download=true` for attachment disposition) |
| `POST` | `/admin/documents/:id/regenerate` | Retry a `failed` document OR issue a new versioned revision (`v2`, `v3`) |
| `POST` | `/admin/documents/:id/send-email` | Email PDF attachment via Notification Module (`{ recipient_email? }`) |
| `POST` | `/admin/documents/:id/send-for-signature` | Create Docuseal signature request (`{ signer_email?, signer_name?, role?, template_id?, send_email? }`) |
| `GET` | `/admin/documents/settings` | Get global or regional settings (`?region_id=...`) + integration status |
| `PUT` | `/admin/documents/settings` | Upsert global or regional settings (`{ region_id?, ... }`) |
| `DELETE` | `/admin/documents/settings` | Reset regional override (`?region_id=reg_...`) back to Global Default |
| `GET / POST` | `/admin/documents/templates` | List presets/custom templates or create a custom template |
| `GET / PUT / DELETE` | `/admin/documents/templates/:id` | Retrieve, update, or delete a custom template |
| `GET / POST` | `/admin/documents/preview` | Live PDF preview (`?document_type=`, `?locale=`, `?order_id=`, `?items=75`) |
| `POST` | `/admin/documents/bulk-generate` | Batch-generate documents (`{ order_ids: string[], document_type }`) |
| `POST` | `/admin/documents/bulk-download` | Stream a `.zip` archive of `{ document_ids: string[] }` |
| `GET` | `/admin/documents/export.csv` | Download formula-safe `.csv` accounting ledger |
| `POST` | `/admin/documents/webhooks/docuseal` | HMAC-verified Docuseal webhook receiver |

### Storefront Endpoints (Requires Authenticated Customer Owning the Order)

| Method | Path | Description |
|---|---|---|
| `GET` | `/store/documents/:order_id` | List customer's generated documents & signature requests for `:order_id` |
| `GET` | `/store/documents/:order_id/invoice.pdf` | Stream customer Invoice PDF |
| `GET` | `/store/documents/:order_id/packing-slip.pdf` | Stream customer Packing Slip PDF |
| `GET` | `/store/documents/:order_id/credit-note.pdf` | Stream customer Credit Note PDF |
| `GET` | `/store/documents/:order_id/receipt.pdf` | Stream customer POS Receipt PDF |
| `GET` | `/store/documents/:order_id/signed.pdf` | Stream customer countersigned PDF |
| `GET` | `/store/documents/:order_id/signing-url` | Get active Docuseal `embed_src` signing URL |

---

## 14. Database Schema (`mpd_` Prefix)

All plugin tables use the `mpd_` prefix (`src/modules/documents/migrations/Migration20261009000000.ts`):
- `mpd_document`: Primary document records, indexed on `order_id`, `related_document_id`, `fulfillment_id`, `refund_id`, and unique on `(document_type, document_number, version)`.
- `mpd_document_settings`: Global (`region_id IS NULL`) and per-region (`region_id`) configuration rows.
- `mpd_document_template`: Custom Handlebars/HTML and POS templates.
- `mpd_signature_request`: Docuseal submission tracking and countersigned PDF metadata.

---

## 15. Development & Testing

```bash
# Run the unit & security test suite (17 tests across Phases 0-8)
npm test

# Type-check with TypeScript
npm run typecheck

# Build the Medusa plugin bundle
npm run build

# Watch mode for local plugin development
npm run dev
```
