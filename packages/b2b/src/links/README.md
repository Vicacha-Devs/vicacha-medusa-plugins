# Links

Remote link definitions that join B2B entities to Medusa core entities — and to each other — without creating foreign keys across module boundaries.

```
links/
├── employee-customer.ts          Employee      ↔  Customer (core)
├── company-customer-group.ts     Company       ↔  CustomerGroup (core)
├── company-carts.ts              Company       ↔  Cart[] (core)
├── order-company.ts              Order (core)  ↔  Company
├── company-approval-setting.ts   Company       ↔  ApprovalSettings
├── cart-approvals.ts             Cart (core)   ↔  Approval[]
├── cart-approval-status.ts       Cart (core)   ↔  ApprovalStatus
└── quote-links.ts                Quote         ↔  Order, Cart, OrderChange, Customer, User (virtual)
```

## Naming convention

Files are named `<left-entity>-<right-entity>.ts`, matching the order of arguments in `defineLink`.

## Link options

| File | `isList` | `deleteCascade` | Notes |
| --- | --- | --- | --- |
| `employee-customer.ts` | — | — | 1:1 |
| `company-customer-group.ts` | ✓ (company) | — | N:1 — many companies per group, one group per company |
| `company-carts.ts` | ✓ | — | 1:N |
| `order-company.ts` | — | — | 1:1 |
| `company-approval-setting.ts` | — | — | 1:1 |
| `cart-approvals.ts` | ✓ | ✓ | 1:N; cascade-deleted with cart |
| `cart-approval-status.ts` | — | ✓ | 1:1; cascade-deleted with cart |

## Virtual links (`quote-links.ts`)

Quote stores its related IDs as plain string columns (`draft_order_id`, `order_change_id`, `cart_id`, `customer_id`). The links are registered with `MedusaModule.setCustomLink` so that `remoteQuery` can resolve them, but no join table is created.

This avoids cross-module FK dependencies while still allowing the quote detail page to expand the draft order and customer via a single `remoteQuery` call.

## Syncing to the database

Links are applied by running migrations in the host application:

```bash
medusa db:migrate
```

Each `defineLink` call creates its own join table. Link tables are named automatically by Medusa based on the two module tokens and entity names.

## Reading linked data

Use `remoteQuery` (available via `req.scope`) or `useRemoteQueryStep` inside workflows:

```ts
const { data } = await remoteQuery({
  company: {
    fields: ["id", "name"],
    employees: { fields: ["id", "spending_limit"] },
  },
})
```

Linked fields (e.g. `employees` on a company) are resolved through the join table automatically.
