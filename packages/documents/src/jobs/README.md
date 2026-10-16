# Scheduled Jobs & Batch Generation

Scheduled jobs run background tasks on a cron schedule in the Medusa v2 server runtime.

```sh
jobs/
└── README.md                 Documentation for batch document generation and scheduled jobs
```

---

## Batch document generation (`src/utils/bulk-generate-documents.ts`)

Batch generation logic lives in `executeBulkDocumentGeneration()` (`src/utils/bulk-generate-documents.ts`) so that it can be invoked both on-demand from the Admin API/UI and from scheduled cron jobs without registering an unwanted default cron timer in host applications.

### How `executeBulkDocumentGeneration` works

- Deduplicates and trims `input.order_ids`.
- Iterates through each `order_id` and executes `generateDocumentWorkflow(container).run(...)`.
- Aggregates results into a `BulkGenerateSummary`:
  - `total`: number of unique order IDs processed
  - `generated`: count of newly generated documents (`was_created: true`)
  - `skipped`: count of orders that already had an up-to-date, non-stale document (`was_created: false`)
  - `failed`: count of orders where generation threw an error
  - `results`: per-order array of `{ order_id, status: "generated" | "skipped" | "failed", document_id?, document_number?, error? }`

### On-demand HTTP endpoint & Admin UI

| Trigger | Path / Component | Description |
| --- | --- | --- |
| Admin REST API | `POST /admin/documents/bulk-generate` | Validates `BulkGenerateSchema` (`order_ids` up to 100, `document_type`, `template_id`, `locale`, `force_new_version`) and calls `executeBulkDocumentGeneration(req.scope, ...)` |
| Admin RouteDrawer | `src/admin/routes/documents/@bulk-generate/page.tsx` | Slide-over drawer modal at `/documents/bulk-generate` using `useBulkGenerateDocuments()` |
| Admin Hub Card | `src/admin/components/documents/documents-bulk-generate-section.tsx` | Inline batch generation card in the `/documents` hub |

---

## Registering a scheduled job in `src/jobs/`

To run `executeBulkDocumentGeneration` automatically on a schedule (for example, nightly backfilling of missing invoices), create a file in `src/jobs/` exporting a handler function and a `config` object:

```ts
// src/jobs/nightly-invoice-backfill.ts
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { executeBulkDocumentGeneration } from "../utils/bulk-generate-documents"

export default async function nightlyInvoiceBackfillJob(
  container: MedusaContainer
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const { data: recentOrders } = await query.graph({
    entity: "order",
    fields: ["id"],
    pagination: { take: 50, skip: 0 },
  })

  const orderIds = (recentOrders || []).map((o: { id: string }) => o.id)
  if (orderIds.length === 0) return

  await executeBulkDocumentGeneration(container, {
    order_ids: orderIds,
    document_type: "invoice",
  })
}

export const config = {
  name: "documents-nightly-invoice-backfill",
  schedule: "0 2 * * *", // Every day at 02:00 AM
}
```
