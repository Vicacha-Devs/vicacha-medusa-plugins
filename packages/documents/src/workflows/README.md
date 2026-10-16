# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) that implement document generation, revision management, stale detection, template CRUD, regional settings management, and Docuseal signature tracking. Every mutation workflow includes roll-back compensation.

```sh
workflows/
├── index.ts                                  Barrel re-exporting all workflows and steps
├── generate-document.ts                      generateDocumentWorkflow — idempotent document generation
├── regenerate-document-revision.ts           regenerateDocumentRevisionWorkflow — issues v2+ revisions or retries failed docs
├── mark-documents-stale.ts                   markDocumentsStaleWorkflow — flags invoices/receipts stale on order edits/cancellations
├── create-document-template.ts               createDocumentTemplateWorkflow — creates custom mpd_document_template
├── update-document-template.ts               updateDocumentTemplateWorkflow — updates custom mpd_document_template
├── delete-document-template.ts               deleteDocumentTemplateWorkflow — deletes custom mpd_document_template
├── delete-document.ts                        deleteDocumentWorkflow — deletes draft/failed mpd_document
├── upsert-document-settings.ts               upsertDocumentSettingsWorkflow — creates/updates global or regional settings
├── delete-region-settings.ts                 deleteRegionSettingsWorkflow — removes regional settings override
├── create-signature-request.ts               createSignatureRequestWorkflow — records Docuseal signature request + audit entry
├── update-signature-request.ts               updateSignatureRequestWorkflow — updates signature request from webhook + audit entry
└── steps/
    ├── fetch-order-context.ts                fetchOrderContextStep — queries Order + fulfillment/refund + optional B2B context
    └── allocate-and-render-document.ts       allocateAndRenderDocumentStep — allocates number, renders PDF, uploads to Modules.FILE, emits document.generated
```

---

## Step conventions

- Every step is created with `createStep` from `@medusajs/framework/workflows-sdk`.
- Steps resolve `DOCUMENTS_MODULE` (`DocumentsModuleService`) and core Medusa services (`ContainerRegistrationKeys.QUERY`, `Modules.ORDER`, `Modules.FILE`, `Modules.EVENT_BUS`) from `container`.
- Mutating steps return previous state or created entity IDs as their second `StepResponse` argument and define a `compensate` handler to roll back database changes if a downstream step fails.

### Core reusable steps (`src/workflows/steps/`)

| Step ID | Export | File | Behavior & Compensation |
| --- | --- | --- | --- |
| `fetch-order-context` | `fetchOrderContextStep` | `steps/fetch-order-context.ts` | Queries order details (`items`, `billing_address`, `shipping_address`, `fulfillments`, `labels`, `customer`) via `query.graph` with fallback to `Modules.ORDER`, extracts fulfillment/refund snapshots, and resolves optional B2B buyer context via `documentsService.resolveOrderB2BContext` |
| `allocate-and-render-document` | `allocateAndRenderDocumentStep` | `steps/allocate-and-render-document.ts` | Checks idempotency, resolves regional/global settings, allocates sequential document number (or archives prior revision into `prior_versions` and increments `version`), renders PDF via `documentsService.renderPdf`, uploads private PDF to `Modules.FILE` (with inline base64 fallback), persists `mpd_document`, and emits `document.generated`. On render failure, records `status: "failed"` with `error_message` for admin retry. Compensates by deleting newly created document records |

---

## Workflow index

| Workflow ID | Export | File | Trigger | Compensation Behavior |
| --- | --- | --- | --- | --- |
| `generate-document` | `generateDocumentWorkflow` | `generate-document.ts` | `POST /admin/documents`, `POST /admin/documents/bulk-generate`, `GET /store/documents/:order_id/invoice.pdf?generate=true`, `order.placed` / `order.fulfillment_created` / `order.refund_created` subscribers | Deletes newly created `mpd_document` record via `allocateAndRenderDocumentStep` compensation |
| `regenerate-document-revision` | `regenerateDocumentRevisionWorkflow` | `regenerate-document-revision.ts` | `POST /admin/documents/:id/regenerate` | Looks up existing document via `lookup-existing-document` step and delegates to `generateDocumentWorkflow.runAsStep` with `force_new_version: true` |
| `mark-documents-stale` | `markDocumentsStaleWorkflow` | `mark-documents-stale.ts` | `order.updated`, `order.edit_confirmed`, and `order.canceled` subscribers | Marks generated `invoice` and `receipt` documents for the order as `is_stale = true` with `stale_reason` and appends `marked_stale` audit log entry |
| `create-document-template` | `createDocumentTemplateWorkflow` | `create-document-template.ts` | `POST /admin/documents/templates` | Deletes the created `mpd_document_template` by ID |
| `update-document-template` | `updateDocumentTemplateWorkflow` | `update-document-template.ts` | `PUT /admin/documents/templates/:id` | Restores the previous `mpd_document_template` snapshot |
| `delete-document-template` | `deleteDocumentTemplateWorkflow` | `delete-document-template.ts` | `DELETE /admin/documents/templates/:id` | Recreates the deleted `mpd_document_template` record from its snapshot |
| `delete-document` | `deleteDocumentWorkflow` | `delete-document.ts` | `DELETE /admin/documents/:id` | Recreates the deleted `mpd_document` record from its snapshot |
| `upsert-document-settings` | `upsertDocumentSettingsWorkflow` | `upsert-document-settings.ts` | `PUT /admin/documents/settings` | Restores previous `mpd_document_settings` row if updated, or deletes the newly created regional override row |
| `delete-region-settings` | `deleteRegionSettingsWorkflow` | `delete-region-settings.ts` | `DELETE /admin/documents/settings?region_id=...` | Recreates the deleted regional `mpd_document_settings` row(s) from their snapshot |
| `create-signature-request` | `createSignatureRequestWorkflow` | `create-signature-request.ts` | `POST /admin/documents/:id/send-for-signature` | Deletes the created `mpd_signature_request` record by ID |
| `update-signature-request` | `updateSignatureRequestWorkflow` | `update-signature-request.ts` | `POST /admin/documents/webhooks/docuseal` | Restores the previous `mpd_signature_request` snapshot |
