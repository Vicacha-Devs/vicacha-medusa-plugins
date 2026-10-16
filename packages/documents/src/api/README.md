# API Routes

File-based REST routes under the `admin` and `store` namespaces, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```sh
api/
├── validators.ts                                   Zod request validation schemas and inferred input types
├── middlewares.ts                                  rawBody webhook middleware & assertCustomerOwnsOrder anti-IDOR guard
├── admin/
│   ├── plugin/
│   │   └── route.ts                                GET /admin/plugin — health/discovery probe
│   └── documents/
│       ├── route.ts                                GET, POST /admin/documents — list & generate documents
│       ├── [id]/
│       │   ├── route.ts                            GET, DELETE /admin/documents/:id — detail & delete draft/failed
│       │   ├── pdf/
│       │   │   └── route.ts                        GET /admin/documents/:id/pdf — stream binary PDF
│       │   ├── regenerate/
│       │   │   └── route.ts                        POST /admin/documents/:id/regenerate — issue v2+ revision or retry
│       │   ├── send-email/
│       │   │   └── route.ts                        POST /admin/documents/:id/send-email — email PDF attachment
│       │   └── send-for-signature/
│       │       └── route.ts                        POST /admin/documents/:id/send-for-signature — Docuseal dispatch
│       ├── bulk-download/
│       │   └── route.ts                            POST /admin/documents/bulk-download — stream PKZIP archive
│       ├── bulk-generate/
│       │   └── route.ts                            POST /admin/documents/bulk-generate — batch generation across orders
│       ├── export.csv/
│       │   └── route.ts                            GET /admin/documents/export.csv — accounting CSV export
│       ├── preview/
│       │   └── route.ts                            GET /admin/documents/preview — live PDF preview (mock or real order)
│       ├── settings/
│       │   └── route.ts                            GET, PUT, DELETE /admin/documents/settings — global & regional settings
│       ├── templates/
│       │   ├── route.ts                            GET, POST /admin/documents/templates — list & create templates
│       │   └── [id]/
│       │       └── route.ts                        GET, PUT, DELETE /admin/documents/templates/:id — template CRUD
│       └── webhooks/
│           └── docuseal/
│               └── route.ts                        POST /admin/documents/webhooks/docuseal — HMAC-verified webhook
└── store/
    ├── plugin/
    │   └── route.ts                                GET /store/plugin — storefront discovery probe
    └── documents/
        └── [order_id]/
            ├── _shared.ts                          Shared streamCustomerOrderDocumentPdf helper with anti-IDOR check
            ├── route.ts                            GET /store/documents/:order_id — list customer order documents
            ├── invoice.pdf/
            │   └── route.ts                        GET /store/documents/:order_id/invoice.pdf
            ├── packing-slip.pdf/
            │   └── route.ts                        GET /store/documents/:order_id/packing-slip.pdf
            ├── credit-note.pdf/
            │   └── route.ts                        GET /store/documents/:order_id/credit-note.pdf
            ├── receipt.pdf/
            │   └── route.ts                        GET /store/documents/:order_id/receipt.pdf
            ├── signed.pdf/
            │   └── route.ts                        GET /store/documents/:order_id/signed.pdf — countersigned PDF
            └── signing-url/
                └── route.ts                        GET /store/documents/:order_id/signing-url — Docuseal embed URL
```

---

## Admin endpoints

| Method | Path | Validator | Workflow / Handler | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/admin/documents` | `ListDocumentsQuerySchema` | `documentsService.listAndCountDocuments` | Lists documents with filtering (`order_id`, `document_type`, `status`, `is_stale`, `q`, `date_from`, `date_to`, `limit`, `offset`) and hydrated `signature_request` |
| `POST` | `/admin/documents` | `GenerateDocumentSchema` | `generateDocumentWorkflow` | Generates an `invoice`, `packing_slip`, `credit_note`, or `receipt` for an order |
| `GET` | `/admin/documents/:id` | — | `documentsService.listDocuments` | Retrieves a document with its `signature_requests` and `related_children` |
| `DELETE` | `/admin/documents/:id` | — | `deleteDocumentWorkflow` | Deletes a `draft` or `failed` document (generated invoices and credit notes are immutable and protected) |
| `GET` | `/admin/documents/:id/pdf` | — | `documentsService.getDocumentPdfBuffer` | Streams the binary PDF (or a specific historical `?version=N` from `prior_versions`) |
| `POST` | `/admin/documents/:id/regenerate` | — | `regenerateDocumentRevisionWorkflow` | Issues a new revision (`v2`, `v3`, ...) archiving the prior version, or retries a `failed` generation |
| `POST` | `/admin/documents/:id/send-email` | — | `sendDocumentEmailNotification` | Emails the document PDF attachment via `Modules.NOTIFICATION` (`recipient_email` override supported) |
| `POST` | `/admin/documents/:id/send-for-signature` | `SendForSignatureSchema` | `createSignatureRequestWorkflow` | Creates a Docuseal signature submission and records `mpd_signature_request` |
| `POST` | `/admin/documents/bulk-generate` | `BulkGenerateSchema` | `executeBulkDocumentGeneration` | Batch-generates documents for up to 100 `order_ids` |
| `POST` | `/admin/documents/bulk-download` | `BulkDownloadSchema` | `buildZipArchive` | Streams a zero-dependency PKZIP archive containing up to 100 document PDFs |
| `GET` | `/admin/documents/export.csv` | — | `buildDocumentsAccountingCsv` | Streams an accounting CSV export protected against spreadsheet formula injection |
| `GET` | `/admin/documents/preview` | — | `documentsService.renderPdf` | Streams a live preview PDF using a 4-item mock order, 75-item stress test (`?items_count=75`), or real `?order_id=...` |
| `GET` | `/admin/documents/settings` | — | `documentsService.resolveSettings` | Returns global or regional (`?region_id=...`) settings, `is_regional_override`, `configured_region_ids`, and integration status |
| `PUT` | `/admin/documents/settings` | `UpdateSettingsSchema` | `upsertDocumentSettingsWorkflow` | Creates or updates global (`region_id: null`) or regional (`region_id: "reg_..."`) settings |
| `DELETE` | `/admin/documents/settings` | — | `deleteRegionSettingsWorkflow` | Deletes a regional settings override (`?region_id=reg_...`) so the region falls back to global defaults |
| `GET` | `/admin/documents/templates` | — | `documentsService.listDocumentTemplates` | Lists custom templates and built-in React PDF presets (`clean`, `classic`, `compact`, `packing_slip`, `credit_note`, `pos_80mm`, `pos_58mm`) |
| `POST` | `/admin/documents/templates` | `TemplateSchema` | `createDocumentTemplateWorkflow` | Creates a custom `mpd_document_template` |
| `GET` | `/admin/documents/templates/:id` | — | `documentsService.listDocumentTemplates` | Retrieves a custom template by ID |
| `PUT` | `/admin/documents/templates/:id` | `TemplateSchema.partial()` | `updateDocumentTemplateWorkflow` | Updates a custom template |
| `DELETE` | `/admin/documents/templates/:id` | — | `deleteDocumentTemplateWorkflow` | Deletes a non-system custom template |
| `POST` | `/admin/documents/webhooks/docuseal` | — | `updateSignatureRequestWorkflow` | Processes HMAC-verified Docuseal webhook events (`submission.completed`, `submission.declined`, etc.) |
| `GET` | `/admin/plugin` | — | — | Returns `200 OK` plugin probe |

---

## Store endpoints

Every `/store/documents/[order_id]/*` endpoint enforces customer ownership via `assertCustomerOwnsOrder(req, order_id)` before querying or streaming any document.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/store/documents/:order_id` | Lists all `generated` documents and signature request statuses for the authenticated customer's order |
| `GET` | `/store/documents/:order_id/invoice.pdf` | Streams the latest generated invoice PDF (or generates on-the-fly if `?generate=true` and `auto_generate_invoice` is enabled) |
| `GET` | `/store/documents/:order_id/packing-slip.pdf` | Streams the latest generated packing slip PDF for the order |
| `GET` | `/store/documents/:order_id/credit-note.pdf` | Streams the latest generated credit note PDF for the order |
| `GET` | `/store/documents/:order_id/receipt.pdf` | Streams the latest generated POS receipt PDF for the order |
| `GET` | `/store/documents/:order_id/signed.pdf` | Streams the countersigned PDF for a completed signature request (validated via `validateSafeExternalUrl`) |
| `GET` | `/store/documents/:order_id/signing-url` | Returns the active Docuseal `embed_src` signing URL and status for the customer's order |
| `GET` | `/store/plugin` | Returns `200 OK` storefront plugin probe |

---

## Security & middlewares (`src/api/middlewares.ts`)

### `assertCustomerOwnsOrder(req, orderId)` (Anti-IDOR / CWE-639)

Verifies that `req.auth_context.actor_id` is an authenticated `"customer"` and matches the requested order's `customer_id` (queried via `ContainerRegistrationKeys.QUERY` with fallback to `Modules.ORDER`):

- Returns `{ allowed: false, status: 401 }` if unauthenticated or not a customer actor.
- Returns `{ allowed: false, status: 403 }` if the order belongs to a different customer or has no `customer_id`.
- Returns `{ allowed: false, status: 404 }` if the order does not exist.
- Returns `{ allowed: true, status: 200 }` when ownership is verified.

### Webhook `preserveRawBody` configuration

`src/api/middlewares.ts` configures `bodyParser: { preserveRawBody: true }` on `/admin/documents/webhooks/docuseal` via `defineMiddlewares` so that `req.rawBody` is preserved for `crypto.timingSafeEqual` HMAC-SHA256 verification (`X-Docuseal-Signature`).

---

## Validation schemas (`src/api/validators.ts`)

All request payloads and query parameters are validated with Zod schemas defined in `src/api/validators.ts`:

| Schema | Inferred Type | Used By |
| --- | --- | --- |
| `GenerateDocumentSchema` | `GenerateDocumentInput` | `POST /admin/documents` |
| `ListDocumentsQuerySchema` | `ListDocumentsQueryInput` | `GET /admin/documents` |
| `UpdateSettingsSchema` | `UpdateSettingsInput` | `PUT /admin/documents/settings` |
| `TemplateSchema` | `TemplateInput` | `POST /admin/documents/templates`, `PUT /admin/documents/templates/:id` |
| `BulkGenerateSchema` | `BulkGenerateInput` | `POST /admin/documents/bulk-generate` |
| `BulkDownloadSchema` | `BulkDownloadInput` | `POST /admin/documents/bulk-download` |
| `SendForSignatureSchema` | `SendForSignatureInput` | `POST /admin/documents/:id/send-for-signature` |
