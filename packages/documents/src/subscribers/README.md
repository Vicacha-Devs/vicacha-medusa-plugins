# Subscribers

Event subscribers that automate document generation, stale revision detection on order edits/cancellations, and email PDF delivery in response to Medusa v2 EventBus events.

```sh
subscribers/
├── order-placed.ts                 order.placed → auto-generates invoice and/or POS receipt
├── order-updated.ts                order.updated, order.edit_confirmed → marks invoices/receipts stale
├── order-canceled.ts               order.canceled → marks invoices/receipts stale
├── fulfillment-created.ts          order.fulfillment_created, shipment.created → auto-generates packing slip
├── refund-created.ts               order.refund_created, payment.refunded → auto-generates credit note
└── document-generated-email.ts     document.generated → emails PDF attachment via Modules.NOTIFICATION
```

---

## Subscriber index

| File | Subscribed Event(s) | Settings Flag Checked | Workflow / Action Invoked |
| --- | --- | --- | --- |
| `order-placed.ts` | `order.placed` | `auto_generate_invoice !== false`, `auto_generate_receipt === true` | Resolves regional/global settings for `data.region_id` and runs `generateDocumentWorkflow` for `"invoice"` (enabled by default) and `"receipt"` (when enabled) |
| `order-updated.ts` | `order.updated`, `order.edit_confirmed` | — | Runs `markDocumentsStaleWorkflow` for the order with reason `"Order edit was confirmed after document generation"` or `"Order details were modified after document generation"` |
| `order-canceled.ts` | `order.canceled` | — | Runs `markDocumentsStaleWorkflow` for the order with reason `"Order was canceled"` |
| `fulfillment-created.ts` | `order.fulfillment_created`, `shipment.created` | `auto_generate_packing_slip === true` | Resolves regional/global settings and runs `generateDocumentWorkflow` with `document_type: "packing_slip"` and `fulfillment_id` |
| `refund-created.ts` | `order.refund_created`, `payment.refunded` | `auto_generate_credit_note !== false` | Resolves regional/global settings, locates the original generated `invoice` for the order, and runs `generateDocumentWorkflow` with `document_type: "credit_note"`, `refund_id`, `refund_amount`, `refund_reason`, and `related_document_id` |
| `document-generated-email.ts` | `document.generated` | `auto_email_invoice`, `auto_email_packing_slip`, `auto_email_credit_note`, `auto_email_receipt` | Calls `sendDocumentEmailNotification()` to send the generated PDF attachment via `Modules.NOTIFICATION` using template `document-<type>`, updates `emailed_at`, and appends an `"emailed"` audit log entry (non-blocking if Notification provider is unconfigured) |

---

## Conventions

- Every subscriber file exports a default async handler function accepting `SubscriberArgs<T>` and a named `config: SubscriberConfig` specifying the `event` name or array of event names.
- Settings flags (`auto_generate_*` and `auto_email_*`) are resolved per region via `documentsService.resolveSettings(region_id)` so individual regions can override global automation behavior.
- `sendDocumentEmailNotification` is also exported from `src/subscribers/document-generated-email.ts` so `POST /admin/documents/:id/send-email` can trigger manual email delivery with `force: true` and an optional `recipient_email` override.
