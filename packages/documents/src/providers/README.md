# Providers & External Integrations

`@vicacha-devs/medusa-plugin-documents` integrates with Medusa v2's core `Modules.FILE` and `Modules.NOTIFICATION` providers, and includes built-in optional integrations for **Docuseal** (e-signatures) and **B2B Buyer Context** resolution.

```sh
modules/documents/
├── integrations/
│   └── b2b-resolver.ts       Optional 3-tier B2B buyer context resolver (zero hard dependency)
└── services/
    └── docuseal.ts           Optional Docuseal REST client, HMAC webhook verifier & SSRF guard
```

---

## 1. Medusa File Module (`Modules.FILE`) — Immutable PDF Storage

During `allocateAndRenderDocumentStep` (`src/workflows/steps/allocate-and-render-document.ts`), rendered PDF buffers are uploaded to the host application's configured File Module provider (`@medusajs/medusa/file-local`, `@medusajs/medusa/file-s3`, etc.):

- **Upload format**: Calls `fileModuleService.createFiles({ filename, mimeType: "application/pdf", content: pdfBuffer.toString("base64"), access: "private" })`.
- **Persistence**: Stores `file_id`, `file_url`, and `file_size` on `mpd_document`, and archives previous versions in `mpd_document.prior_versions` whenever a revision (`v2`, `v3`, ...) is issued.
- **Zero-config fallback**: If no File Module provider is configured, `allocateAndRenderDocumentStep` stores an inline `data:application/pdf;base64,...` URI and `DocumentsModuleService.getDocumentPdfBuffer()` can also deterministically re-render the exact PDF from `mpd_document.render_context_snapshot` and `mpd_document.settings_snapshot`.
- **Private proxy streaming**: Neither Admin nor Storefront clients access raw storage bucket URLs directly; PDFs are streamed through `/admin/documents/:id/pdf` and `/store/documents/:order_id/<type>.pdf`.

---

## 2. Medusa Notification Module (`Modules.NOTIFICATION`) — Email PDF Attachments

`sendDocumentEmailNotification()` in `src/subscribers/document-generated-email.ts` delivers generated PDFs via `Modules.NOTIFICATION` (`channel: "email"`), triggered either automatically on `document.generated` (when `auto_email_<type>` is enabled) or manually via `POST /admin/documents/:id/send-email`:

| Document Type | Settings Flag | Notification Template | Attachment Filename |
| --- | --- | --- | --- |
| `invoice` | `auto_email_invoice` | `document-invoice` | `invoice-<document_number>.pdf` |
| `packing_slip` | `auto_email_packing_slip` | `document-packing-slip` | `packing_slip-<document_number>.pdf` |
| `credit_note` | `auto_email_credit_note` | `document-credit-note` | `credit_note-<document_number>.pdf` |
| `receipt` | `auto_email_receipt` | `document-receipt` | `receipt-<document_number>.pdf` |

Each notification call receives `data` (`document_id`, `document_number`, `document_type`, `order_id`, `order_display_id`, `company_name`) and `attachments` (`[{ filename, content: base64Pdf, content_type: "application/pdf" }]`), updates `mpd_document.emailed_at`, and appends an `"emailed"` entry to `mpd_document.audit_log`.

---

## 3. Optional Docuseal E-Signature Integration (`src/modules/documents/services/docuseal.ts`)

`DocusealService` (`documentsService.docuseal`) provides optional electronic signature workflows without requiring Docuseal for standard B2C/B2B stores:

- **Configuration**: Enabled via plugin options (`options.docuseal`) or environment variables (`DOCUSEAL_API_KEY`, `DOCUSEAL_URL`, `DOCUSEAL_WEBHOOK_SECRET`, `DOCUSEAL_DEFAULT_TEMPLATE_ID`).
- **Key methods**:
  - `isConfigured()`: Returns `true` when an API key is configured.
  - `createSubmissionFromPdf(params)`: Sends a base64 PDF document (`POST /submissions/pdf`) or template submission (`POST /submissions`) to Docuseal and returns `external_submission_id`, `embed_src`, and `status`.
  - `getSubmission(submissionId)`: Fetches submission status (`GET /submissions/:id`).
  - `verifyWebhookSignature(rawBody, signatureHeader)`: Constant-time HMAC-SHA256 verification (`crypto.timingSafeEqual`) for `POST /admin/documents/webhooks/docuseal`.
- **SSRF protection (`validateSafeExternalUrl`)**: Blocks private IPv4/IPv6 ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`, `localhost`, `.internal`, `.local`) and enforces `https:` in production before downloading countersigned PDFs.

---

## 4. Optional B2B Buyer Context Resolver (`src/modules/documents/integrations/b2b-resolver.ts`)

`resolveB2BBuyerContext(order, options, container)` enriches invoices, credit notes, and packing slips with B2B buyer fields (`company_name`, `tax_id`, `registration_number`, `purchase_order_number`, `payment_terms`, `buyer_contact_email`, `account_code`) using a 3-tier fallback that never requires a static dependency on an external B2B package:

1. **Tier 1 — Container B2B module resolution**: If `container` is provided and a B2B module is registered (`options.module_key` or `companyModuleService` / `company` / `b2b`), queries the linked company record in a `try/catch` block.
2. **Tier 2 — Order & Customer metadata**: Inspects `order.metadata` and `order.customer.metadata` using customizable field keys (`company_name_field`, `tax_id_field`, `purchase_order_field`, `payment_terms_field`, plus common aliases like `vat_number`, `po_number`, `net_terms`).
3. **Tier 3 — Standard Medusa Order fields**: Falls back to `order.billing_address.company` / `order.shipping_address.company` / `order.customer.company_name`. Returns `{ is_b2b: false }` for standard B2C orders.
