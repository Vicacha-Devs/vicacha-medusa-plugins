# Subscribers

Event subscribers in `src/subscribers/` that listen to Medusa v2 domain events and trigger real-time synchronization to Odoo ERP.

```sh
subscribers/
├── README.md                Subscriber reference and circular-sync loop prevention guide
├── order-placed.ts          order.placed → creates Odoo sale.order, invoice & payment
├── product-updated.ts       product.created, product.updated → exports product catalog changes
├── inventory-updated.ts     inventory-level.updated → exports multi-warehouse stock changes
└── customer-updated.ts      customer.created, customer.updated → syncs customer to res.partner
```

---

## Subscriber Reference

| File | Subscriber ID | Events Listened To | Section Guard Checked | Triggered Action |
| :--- | :--- | :--- | :--- | :--- |
| `order-placed.ts` | `odoo-order-placed-subscriber` | `order.placed` | `orders.orderSync !== false` (checked inside `syncOrderToOdoo`) | Calls `executeOrderSyncToOdoo(container, { orderId, manual: false })` (`src/workflows/index.ts`) |
| `product-updated.ts` | `odoo-product-updated-subscriber` | `product.created`, `product.updated` | `product.enableProductSync === true` and `product.direction` in `["medusa_to_odoo", "bidirectional"]` | Calls `odooService.exportProductsToOdoo(container, undefined, "event")` |
| `inventory-updated.ts` | `odoo-inventory-updated-subscriber` | `inventory-level.updated` | `inventory.enableStock === true` and `inventory.direction` in `["medusa_to_odoo", "bidirectional"]` | Calls `odooService.exportInventoryToOdoo(container, undefined, "event")` |
| `customer-updated.ts` | `odoo-customer-updated-subscriber` | `customer.created`, `customer.updated` | `customers.enableCustomerSync === true` and `customers.direction` in `["medusa_to_odoo", "bidirectional"]` | Calls `odooService.syncCustomers({ directionOverride: "medusa_to_odoo", trigger: "event" })` |

---

## Circular-Sync Loop Prevention

Bidirectional ERP synchronization (`direction: "bidirectional"`) can easily cause infinite event loops if an import from Odoo mutates a Medusa entity, which emits a `product.updated` / `inventory-level.updated` / `customer.updated` event, which in turn exports the same entity back to Odoo.

`medusa-plugin-odoo` prevents circular sync loops through three layers:

1. **SHA-256 Payload Checksums (`external_checksum`)**:
   - Whenever an entity is imported from Odoo or exported to Odoo, `OdooModuleService` computes a deterministic SHA-256 digest via `computeExternalChecksum(payload)` (`src/modules/odoo/utils/security.ts`) and stores it on the corresponding `mpo_erp_mapping` row (`external_checksum`).
   - When a subscriber triggers an export (`trigger: "event"`), `OdooModuleService` compares the entity's current normalized checksum against `mpo_erp_mapping.external_checksum`. If the checksum is unchanged, the record is counted as `skipped` and no RPC write is sent to Odoo.
2. **Direction & Section Guards**:
   - Each subscriber inspects its section settings (`product`, `inventory`, `customers`, `orders`) before invoking any sync operation. If `direction` is set to `"odoo_to_medusa"` or the section toggle is disabled, the subscriber exits immediately (`no-op`).
3. **Idempotent Order Mapping (`mpo_erp_mapping` & `metadata.odoo_order_id`)**:
   - When `executeOrderSyncToOdoo` writes `odoo_order_id` back to the Medusa order's `metadata`, `order-placed.ts` will never re-create a duplicate `sale.order` because `syncOrderToOdoo` checks `mpo_erp_mapping` (`entity_type: "order"`, `medusa_id: order.id`) and `order.metadata.odoo_order_id` first.

---

## Error Handling & Dead-Letter Queue

All four subscribers wrap their execution in a non-blocking `try / catch` block so that temporary Odoo downtime or network issues never block Medusa checkout (`order.placed`) or catalog mutations. Any failed sync operation is automatically logged to:
- `mpo_sync_failure` (`ErpSyncFailure` dead-letter queue, visible in `/app/odoo/logs`)
- `mpo_sync_log` (`ErpSyncLog` audit history)
- `odooMetrics` (`odoo_open_failures_total` and `odoo_sync_runs_total{status="failed"}`)