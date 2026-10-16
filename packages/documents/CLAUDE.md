# CLAUDE.md — `medusa-plugin-documents`

## 1. Purpose & Architectural Philosophy

`medusa-plugin-documents` is a full-featured commercial document management plugin for **Medusa v2** (`>= 2.13.x`) combining:
- **`@agilo/medusa-invoices-plugin`**: `@react-pdf/renderer` presets (`clean`, `classic`, `compact`), TipTap rich-text notes renderer, immutable File Module PDF storage, `settings_snapshot` per document, and failed generation retry.
- **`@logicdine/medusa-plugin-invoice`**: `Handlebars + pdfmake` custom HTML template engine (`mpd_document_template`), visual style/section toggles, `80mm`/`58mm` POS thermal receipts with dynamic height calculation, order edit `is_stale` detection, and versioned revisions (`v1`, `v2`, ...).
- **`@webbers/invoices-medusa`**: Credit notes (`order.refund_created`) with negative totals and `related_document_id` linking, private File Module proxy streaming, and strict customer ownership verification.
- **`@rsc-labs/medusa-documents-v2`**: Custom numbering format tokens (`{prefix}`, `{year}`, `{short_year}`, `{month}`, `{day}`, `{number}`, `{order_display_id}`), `forced_next_number`, independent sequences per `DocumentType`, packing slips (`order.fulfillment_created`), 10-locale i18n (`en`, `es`, `pl`, `de`, `fr`, `pt`, `it`, `nl`, `tr`, `ar`), and dedicated `/app/documents` accounting hub.
- **Enterprise Extensions**: Per-region settings overrides (`region_id`), Notification Module email attachments, bulk generation & ZIP/CSV exports, **10-locale Admin UI localization (`react-i18next` + RTL support)**, **optional B2B buyer context resolution**, and **optional Docuseal e-signature integration**.

---

## 2. Directory Structure

```text
src/
├── index.ts                                  # Public package exports (modules, workflows, sdk, hooks, types, validators)
├── types/
│   ├── index.ts                              # Central TypeScript domain, workflow, API, SDK & hook contracts
│   ├── constants.ts                          # DOCUMENTS_MODULE, DOCUMENT_TYPES, SUPPORTED_LOCALES, BUILTIN_PRESETS
│   ├── enums.ts                              # DocumentTypeEnum, DocumentStatusEnum, SignatureStatusEnum, etc.
│   └── errors.ts                             # DocumentErrorCode & mapDocumentError() normalizer
├── sdk/
│   ├── index.ts                              # SDK barrel export
│   ├── client.ts                             # Isomorphic Admin & Store SDK clients (documentsAdminSdk, documentsStoreSdk)
│   └── query-keys.ts                         # Hierarchical React Query key factory (documentsQueryKeys)
├── hooks/
│   ├── index.ts                              # React hooks barrel export
│   ├── use-sdk-primitives.ts                 # Lightweight query/mutation primitives with cache invalidation
│   ├── use-documents-query.ts                # useDocumentsList & useDocumentDetail hooks
│   ├── use-document-mutations.ts             # Generate, regenerate, email, signature, bulk generate & ZIP download hooks
│   ├── use-document-settings.ts              # useDocumentSettings, useDocumentRegions, update & reset regional settings hooks
│   ├── use-document-templates.ts             # useDocumentTemplates & template CRUD mutation hooks
│   └── use-order-documents-widget-state.ts   # State & action controller hook for OrderDocumentsWidget
├── utils/
│   └── bulk-generate-documents.ts            # executeBulkDocumentGeneration() batch generation runner
├── links/
│   ├── README.md
│   └── order-documents.ts                    # Order <-> Document (isList: true) module link
├── modules/
│   ├── README.md
│   └── documents/
│       ├── index.ts                          # Module("documentsModuleService", { service: DocumentsModuleService })
│       ├── service.ts                        # DocumentsModuleService (MedusaService + numbering, snapshots, rendering, audit log)
│       ├── types.ts                          # Re-exports shared domain types & constants from src/types/
│       ├── models/
│       │   ├── index.ts                      # Models barrel export
│       │   ├── document.ts                   # mpd_document
│       │   ├── document-settings.ts          # mpd_document_settings
│       │   ├── document-template.ts          # mpd_document_template
│       │   └── signature-request.ts          # mpd_signature_request
│       ├── migrations/
│       │   └── Migration20261009000000.ts    # DDL for all 4 mpd_ tables & indexes
│       ├── integrations/
│       │   └── b2b-resolver.ts               # Optional 3-tier B2B buyer context resolver (zero hard dependency)
│       ├── services/
│       │   └── docuseal.ts                   # Optional Docuseal REST client + HMAC verification + SSRF guard
│       ├── i18n/
│       │   ├── index.ts                      # getTranslations(locale, customOverrides) & normalizeLocale()
│       │   ├── types.ts                      # DocumentTranslations interface
│       │   └── locales/
│       │       ├── index.ts                  # LOCALE_DICTIONARIES barrel for all 10 locales
│       │       └── *.ts                      # ar, de, en, es, fr, it, nl, pl, pt, tr PDF dictionaries
│       ├── utils/
│       │   ├── numbering.ts                  # formatDocumentNumber() token engine
│       │   ├── formatters.ts                 # Currency, date, address, filename & HTML sanitizers
│       │   ├── zip-builder.ts                # Zero-dependency PKZIP archive generator (zlib.deflateRawSync + CRC32)
│       │   ├── csv-exporter.ts               # Formula-injection-safe accounting CSV builder
│       │   └── mock-order.ts                 # Mock render context generator (4-item standard & 75-item stress test)
│       └── renderer/
│           ├── index.ts                      # Dual Engine dispatcher (@react-pdf/renderer + Handlebars/pdfmake)
│           ├── react-pdf/
│           │   ├── clean-template.tsx
│           │   ├── classic-template.tsx
│           │   ├── compact-template.tsx
│           │   ├── packing-slip-template.tsx
│           │   ├── credit-note-template.tsx
│           │   ├── pos-receipt-template.tsx
│           │   ├── signature-block.tsx
│           │   └── tiptap-renderer.tsx
│           └── pdfmake/
│               ├── default-templates.ts
│               └── html-engine.ts
├── workflows/
│   ├── README.md
│   ├── index.ts                              # Exports all 11 workflows and 2 steps
│   ├── generate-document.ts                  # generateDocumentWorkflow
│   ├── regenerate-document-revision.ts       # regenerateDocumentRevisionWorkflow
│   ├── mark-documents-stale.ts               # markDocumentsStaleWorkflow
│   ├── create-document-template.ts           # createDocumentTemplateWorkflow
│   ├── update-document-template.ts           # updateDocumentTemplateWorkflow
│   ├── delete-document-template.ts           # deleteDocumentTemplateWorkflow
│   ├── delete-document.ts                    # deleteDocumentWorkflow
│   ├── upsert-document-settings.ts           # upsertDocumentSettingsWorkflow
│   ├── delete-region-settings.ts             # deleteRegionSettingsWorkflow
│   ├── create-signature-request.ts           # createSignatureRequestWorkflow
│   ├── update-signature-request.ts           # updateSignatureRequestWorkflow
│   └── steps/
│       ├── fetch-order-context.ts            # Queries Order + resolves optional B2B context
│       └── allocate-and-render-document.ts   # Allocates number, renders PDF, uploads to Modules.FILE, emits event
├── subscribers/
│   ├── README.md
│   ├── order-placed.ts                       # order.placed -> auto_generate_invoice / auto_generate_receipt
│   ├── order-updated.ts                      # order.updated / order.edit_confirmed -> mark stale
│   ├── order-canceled.ts                     # order.canceled -> mark stale
│   ├── fulfillment-created.ts                # order.fulfillment_created / shipment.created -> auto_generate_packing_slip
│   ├── refund-created.ts                     # order.refund_created / payment.refunded -> auto_generate_credit_note
│   └── document-generated-email.ts           # document.generated -> auto_email_* via Modules.NOTIFICATION
├── jobs/
│   └── README.md                             # Batch generation & scheduled jobs guide
├── providers/
│   └── README.md                             # File Module, Notification Module, Docuseal & B2B integration guide
├── api/
│   ├── README.md
│   ├── validators.ts                         # Zod request validation schemas & inferred types
│   ├── middlewares.ts                        # rawBody webhook config & assertCustomerOwnsOrder helper
│   ├── admin/
│   │   ├── plugin/route.ts                   # GET /admin/plugin probe
│   │   └── documents/                        # Admin REST routes (CRUD, pdf, regenerate, send-email, send-for-signature, bulk-generate, bulk-download, export.csv, preview, settings, templates, webhooks/docuseal)
│   └── store/
│       ├── plugin/route.ts                   # GET /store/plugin probe
│       └── documents/[order_id]/             # Storefront REST routes (list, invoice.pdf, packing-slip.pdf, credit-note.pdf, receipt.pdf, signed.pdf, signing-url)
├── admin/
│   ├── README.md
│   ├── tsconfig.json
│   ├── vite-env.d.ts
│   ├── components/documents/
│   │   ├── index.ts                          # Barrel export for all decoupled document UI components
│   │   ├── constants.ts                      # SUPPORTED_UI_LOCALES, DEFAULT_SETTINGS_VALUES, documentSettingsFormSchema
│   │   ├── documents-overview-section.tsx    # Hub StatCards & NavigationCards
│   │   ├── documents-filters-bar.tsx         # Hub search, filters, CSV export & ZIP download toolbar
│   │   ├── documents-table-section.tsx       # Hub filterable documents table container
│   │   ├── documents-table-row.tsx           # Hub document row
│   │   ├── documents-bulk-generate-section.tsx # Hub batch generation CTA section
│   │   ├── order-document-row.tsx            # Order sidebar document row & action buttons
│   │   ├── order-document-audit-panel.tsx    # Order sidebar expandable audit log & prior versions panel
│   │   ├── settings-company-section.tsx      # Company identity, colors, presets, notes & bank details section
│   │   ├── settings-numbering-section.tsx    # Numbering format tokens & sequence section
│   │   ├── settings-preview-section.tsx      # Live PDF preview section (4-item mock, 75-item stress test, real order)
│   │   ├── settings-region-scope-section.tsx # Global vs. regional override scope selector
│   │   └── settings-automation-section.tsx   # Auto-generate, auto-email & signature toggles section
│   ├── i18n/
│   │   ├── README.md
│   │   ├── index.ts                          # Medusa Admin i18next resource bundle (10 locales)
│   │   └── json/*.json                       # ar, de, en, es, fr, it, nl, pl, pt, tr Admin UI translations
│   ├── widgets/
│   │   └── order-documents-widget.tsx        # Localized Order detail sidebar widget (order.details.side.after)
│   └── routes/documents/
│       ├── page.tsx                          # /documents — Overview & Documents Hub (SINGLE_COLUMN)
│       ├── @bulk-generate/page.tsx           # /documents/bulk-generate — RouteDrawer modal for batch generation
│       └── settings/page.tsx                 # /documents/settings — Settings & Template Studio (TWO_COLUMN)
└── __tests__/
    ├── medusa-shim.mjs                       # Test runner shim for Medusa framework imports
    ├── register-ts-resolver.mjs              # Node native TS module resolver hook
    └── documents.spec.ts                     # Unit, i18n parity & security test suite
```

---

## 3. Key Design & Security Invariants

1. **Optional Integrations Never Break B2C Stores**:
   - Never add static imports of external B2B packages. Always use `resolveB2BBuyerContext()` (`src/modules/documents/integrations/b2b-resolver.ts`), which wraps container lookups in `try/catch` and falls back to `order.metadata` / `customer.metadata` / `billing_address.company`.
   - `DocusealService` (`src/modules/documents/services/docuseal.ts`) is only active when `docuseal.isConfigured()` returns `true`.
2. **Type-Only Imports (`import type`)**:
   - Always use `import type { ... }` when importing interfaces or type aliases from `types.ts` so Node's native TypeScript test runner (`--experimental-strip-types`) and `tsc` both execute cleanly.
3. **Mandatory Security Controls**:
   - **Storefront Anti-IDOR**: Every `/store/documents/[order_id]/*` handler must call `assertCustomerOwnsOrder(req, order_id)` before querying or streaming any document.
   - **Webhook HMAC Verification**: `POST /admin/documents/webhooks/docuseal` must verify `X-Docuseal-Signature` via `verifyWebhookSignature` (`crypto.timingSafeEqual`).
   - **SSRF Protection**: Any remote URL fetched by the server must pass `validateSafeExternalUrl()`.
   - **XSS & Formula Injection Prevention**: Always sanitize custom HTML with `sanitizeHtmlForPdf()` and escape CSV cells with `escapeCsvCell()`.

---

## 4. Development & Verification Commands

```bash
# Run unit, i18n & security test suite (Node native test runner)
npm test

# Type-check TypeScript sources
npm run typecheck

# Build Medusa v2 plugin
npm run build
```
