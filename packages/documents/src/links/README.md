# Links

Remote link definition that joins Medusa core `Order` entities to `Document` (`mpd_document`) records without creating foreign keys across module boundaries.

```sh
links/
└── order-documents.ts        Order (core)  ↔  Document[] (mpd_document, isList: true)
```

---

## Link options

| File | Left Entity | Right Entity | `isList` | `deleteCascade` | Notes |
| --- | --- | --- | --- | --- | --- |
| `order-documents.ts` | `OrderModule.linkable.order` | `DocumentsModule.linkable.mpdDocument` | ✓ | — | 1:N — an order can have multiple generated documents (invoices, packing slips, credit notes, POS receipts, and revisions) |

---

## Definition (`src/links/order-documents.ts`)

```ts
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import DocumentsModule from "../modules/documents"

export default defineLink(OrderModule.linkable.order, {
  linkable: DocumentsModule.linkable.mpdDocument,
  isList: true,
})
```

In addition to the module link, `mpd_document` stores an indexed `order_id` column (`IDX_mpd_document_order_id`) so `DocumentsModuleService.listDocuments({ order_id })` can filter documents directly with zero join overhead.

---

## Syncing to the database

Links are applied when running migrations in the host Medusa application:

```bash
npx medusa db:migrate
```

---

## Querying linked documents

### 1. Via `query.graph` (Medusa Query)

```ts
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

const { data: orders } = await query.graph({
  entity: "order",
  fields: [
    "id",
    "display_id",
    "mpd_documents.*",
  ],
  filters: { id: orderId },
})
```

### 2. Via `DocumentsModuleService`

```ts
import { DOCUMENTS_MODULE } from "@vicacha-devs/medusa-plugin-documents"

const documentsService = req.scope.resolve(DOCUMENTS_MODULE)

const documents = await documentsService.listDocuments(
  { order_id: orderId },
  { order: { created_at: "DESC" } }
)
```
