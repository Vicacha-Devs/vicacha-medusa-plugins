# Modules

Custom Medusa v2 module (`DOCUMENTS_MODULE = "documentsModuleService"`) that manages document persistence, sequential numbering, regional settings inheritance, dual-engine PDF rendering, 10-locale PDF translations, optional B2B buyer context resolution, and optional Docuseal e-signature integration.

```sh
modules/
└── documents/
    ├── index.ts                              Exports DOCUMENTS_MODULE constant + Module("documentsModuleService", { service: DocumentsModuleService })
    ├── service.ts                            DocumentsModuleService extending MedusaService
    ├── types.ts                              Re-exports shared domain types, enums, and constants from src/types/
    ├── models/
    │   ├── index.ts                          Barrel re-exporting all 4 DML models
    │   ├── document.ts                       mpd_document — generated commercial documents, snapshots, versions, and audit logs
    │   ├── document-settings.ts              mpd_document_settings — global (region_id = null) and per-region settings
    │   ├── document-template.ts              mpd_document_template — custom Handlebars/pdfmake & React PDF templates
    │   └── signature-request.ts              mpd_signature_request — Docuseal e-signature tracking records
    ├── migrations/
    │   └── Migration20261009000000.ts        DDL migration creating all 4 mpd_* tables and indexes
    ├── integrations/
    │   └── b2b-resolver.ts                   Optional 3-tier B2B buyer context resolver (zero hard dependency)
    ├── services/
    │   └── docuseal.ts                       Optional Docuseal REST client + HMAC-SHA256 verification + SSRF guard
    ├── i18n/
    │   ├── index.ts                          normalizeLocale() and getTranslations(locale, customOverrides)
    │   ├── types.ts                          DocumentTranslations interface
    │   └── locales/
    │       ├── index.ts                      Exports LOCALE_DICTIONARIES map for all 10 locales
    │       ├── ar.ts                         Arabic PDF translations
    │       ├── de.ts                         German PDF translations
    │       ├── en.ts                         English PDF translations
    │       ├── es.ts                         Spanish PDF translations
    │       ├── fr.ts                         French PDF translations
    │       ├── it.ts                         Italian PDF translations
    │       ├── nl.ts                         Dutch PDF translations
    │       ├── pl.ts                         Polish PDF translations
    │       ├── pt.ts                         Portuguese PDF translations
    │       └── tr.ts                         Turkish PDF translations
    ├── utils/
    │   ├── numbering.ts                      formatDocumentNumber() token engine ({prefix}, {year}, {short_year}, {month}, {day}, {number}, {order_display_id})
    │   ├── formatters.ts                     Currency, date, address, filename, and HTML sanitizers (sanitizeHtmlForPdf)
    │   ├── zip-builder.ts                    Zero-dependency PKZIP archive generator (zlib.deflateRawSync + CRC32)
    │   ├── csv-exporter.ts                   Formula-injection-safe accounting CSV builder (escapeCsvCell)
    │   └── mock-order.ts                     Mock DocumentRenderContext builder (4-item standard & 75-item stress test)
    └── renderer/
        ├── index.ts                          Dual PDF Engine dispatcher (renderDocumentPdf)
        ├── react-pdf/
        │   ├── clean-template.tsx            Modern minimalist A4 invoice preset ("clean")
        │   ├── classic-template.tsx          Executive bordered A4 invoice preset ("classic")
        │   ├── compact-template.tsx          High-density wholesale/B2B A4 invoice preset ("compact")
        │   ├── packing-slip-template.tsx     Warehouse packing slip preset without prices ("packing_slip")
        │   ├── credit-note-template.tsx      Refund credit note preset with negative totals ("credit_note")
        │   ├── pos-receipt-template.tsx      80mm / 58mm thermal POS receipt with dynamic page height ("pos_80mm", "pos_58mm")
        │   ├── signature-block.tsx           Reusable buyer/merchant signature block component
        │   └── tiptap-renderer.tsx           Rich-text notes renderer (plain text, HTML, or TipTap JSON AST)
        └── pdfmake/
            ├── default-templates.ts          Default Handlebars HTML templates, style tokens, and section toggles
            └── html-engine.ts                Handlebars compiler + html-to-pdfmake + pdfmake PDF buffer generator
```

---

## Data models (`src/modules/documents/models/`)

**Service token:** `DOCUMENTS_MODULE` (`"documentsModuleService"`)

| Model | Table Name | Key Columns & Purpose |
| --- | --- | --- |
| `Document` | `mpd_document` | Stores `document_number` (unique), `document_type` (`invoice`, `packing_slip`, `credit_note`, `receipt`), `status` (`draft`, `generated`, `failed`, `voided`), `version`, `is_stale`, `stale_reason`, `order_id`, `fulfillment_id`, `refund_id`, `related_document_id`, `file_id`, `file_url`, immutable `settings_snapshot`, `render_context_snapshot`, `prior_versions`, and `audit_log` |
| `DocumentSettings` | `mpd_document_settings` | Stores global (`region_id = null`) and regional (`region_id = "reg_..."`) configuration: company identity & branding, per-type prefixes/formats/counters/forced next numbers/padding, template presets, `default_locale`, `custom_translations`, `auto_generate_*`, `auto_email_*`, and Docuseal `require_signature` settings |
| `DocumentTemplate` | `mpd_document_template` | Stores custom templates with `name`, `document_type`, `engine` (`react-pdf`, `handlebars`, `pos`), `preset_key`, `page_size` (`A4`, `LETTER`, `LEGAL`, `80MM`, `58MM`), `orientation`, `html_content`, `styles`, `sections`, `is_default`, and `is_system` |
| `SignatureRequest` | `mpd_signature_request` | Tracks e-signature submissions linked to `document_id` and `order_id`: `provider` (`docuseal`), `external_submission_id`, `signer_email`, `signer_name`, `role`, `status` (`pending`, `sent`, `opened`, `completed`, `declined`, `expired`), `embed_src`, `signed_file_id`, `signed_file_url`, and `audit_trail_url` |

---

## Dual PDF Renderer (`src/modules/documents/renderer/`)

`renderDocumentPdf()` in `renderer/index.ts` dispatches rendering across two engines and falls back safely so PDF generation never fails on malformed custom markup:

1. **Engine A — `@react-pdf/renderer` (`renderer/react-pdf/`)**:
   - Used for all built-in presets (`clean`, `classic`, `compact`, `packing_slip`, `credit_note`, `pos_80mm`, `pos_58mm`) and any custom template with `engine: "react-pdf"` or `engine: "pos"`.
   - Includes `pos-receipt-template.tsx` with dynamic height calculation (`226.77pt` for `80mm`, `164.41pt` for `58mm`), `tiptap-renderer.tsx` for rich-text notes, and `signature-block.tsx`.
2. **Engine B — `Handlebars` + `html-to-pdfmake` + `pdfmake` (`renderer/pdfmake/`)**:
   - Used when a custom `mpd_document_template` has `engine: "handlebars"` and non-empty `html_content`.
   - Sanitizes template HTML with `sanitizeHtmlForPdf()`, compiles Handlebars expressions (`{{formatCurrency ...}}`, `{{formatDate ...}}`, `{{#if sections.show_tax_Breakdown}}`), converts HTML to a `pdfmake` document definition, and renders a PDF `Buffer`.
   - Automatically falls back to Engine A if custom HTML compilation fails.

---

## `DocumentsModuleService` methods (`src/modules/documents/service.ts`)

In addition to the auto-generated `MedusaService` CRUD methods (`listDocuments`, `listAndCountDocuments`, `createDocuments`, `updateDocuments`, `deleteDocuments`, `listDocumentSettings`, `listDocumentTemplates`, `listSignatureRequests`, etc.), `DocumentsModuleService` provides:

| Method | Description |
| --- | --- |
| `getPluginOptions()` | Returns the resolved `DocumentsPluginOptions` passed in `medusa-config.ts` |
| `getGlobalSettings()` | Retrieves the global settings row (`region_id = null`), seeding defaults (`INV-{year}-{number}`, `PS-{year}-{number}`, `CN-{year}-{number}`, `RCP-{year}-{number}`) if none exists |
| `resolveSettings(regionId?)` | Resolves per-region settings override for `regionId`, falling back to `getGlobalSettings()` when no regional override is configured |
| `upsertSettings(payload, regionId?)` | Creates or updates global (`regionId = null`) or regional (`regionId = "reg_..."`) settings, seeding new regional overrides from global settings |
| `deleteRegionSettings(regionId)` | Deletes a region-specific override so the region reverts to global settings |
| `allocateNextDocumentNumber(documentType, options)` | Atomically allocates the next sequential number for `documentType` (honoring `{type}_forced_next_number` and format tokens `{prefix}`, `{year}`, `{short_year}`, `{month}`, `{day}`, `{number}`, `{order_display_id}`) and increments `next_{type}_number` |
| `buildSettingsSnapshot(settings, documentType, options)` | Captures an immutable `SettingsSnapshot` (company details, colors, locale, template key, B2B buyer context) stored on `mpd_document.settings_snapshot` |
| `resolveOrderB2BContext(order, container?)` | Resolves optional B2B buyer details via `resolveB2BBuyerContext()` without requiring a hard B2B plugin dependency |
| `renderPdf(context, customTranslations?)` | Dispatches `DocumentRenderContext` to the Dual PDF Renderer (`@react-pdf/renderer` or `Handlebars/pdfmake`) and returns a PDF `Buffer` |
| `appendAuditLog(documentId, entry)` | Appends an immutable `AuditLogEntry` with ISO timestamp to `mpd_document.audit_log` |
| `markOrderDocumentsStale(orderId, reason)` | Marks generated `invoice` and `receipt` records for `orderId` as `is_stale = true` with `stale_reason` and appends a `marked_stale` audit log entry |
| `getDocumentPdfBuffer(documentId)` | Retrieves the PDF `Buffer` for a document from `data:application/pdf;base64,...`, remote `file_url`, or deterministic re-render from `render_context_snapshot` |

---

## Generating & running migrations

```bash
# Generate a new migration after modifying a model in src/modules/documents/models/
npx medusa plugin:db:generate

# Apply migrations in the host Medusa application
npx medusa db:migrate
```
