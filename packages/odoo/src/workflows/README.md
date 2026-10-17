# Workflows

Medusa v2 workflows and orchestration steps defined in `src/workflows/index.ts` that coordinate bidirectional ERP synchronization, order accounting, inventory drift reconciliation, POS barcode resolution, offline POS replay, and inbound Odoo webhooks.

```sh
workflows/
├── README.md          Workflows, steps, triggers, and compensation documentation
└── index.ts           All workflow definitions, steps, and executeOrderSyncToOdoo helper
```

---

## Workflow Architecture & Conventions

- Every workflow is constructed with `createWorkflow` and composed of atomic steps built with `createStep` from `@medusajs/framework/workflows-sdk`.
- Each step resolves `OdooModuleService` from the workflow container via `container.resolve(ODOO_MODULE)` and returns a `StepResponse(result, compensationContext)`.
- Per-entity errors during batch synchronization are recorded in the dead-letter table (`mpo_sync_failure`) and audit log (`mpo_sync_log`) so partial batch failures can be inspected and retried from `/app/odoo/logs`.

---

## Workflow Reference

| Workflow Export / Alias | Workflow ID | Step Name | Input Type | Output Type | Triggers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`syncProductsWithOdooWorkflow`** | `sync-products-with-odoo` | `sync-products` (`syncProductsStep`) | `{ direction?: OdooSyncDirection; trigger?: string }` | `OdooSyncResult` | `POST /admin/odoo/sync/products`, `POST /admin/odoo/sync/all`, `product-updated` subscriber, `odoo-scheduled-sync` job |
| **`syncInventoryWithOdooWorkflow`** | `sync-inventory-with-odoo` | `sync-inventory` (`syncInventoryStep`) | `{ direction?: OdooSyncDirection; trigger?: string }` | `OdooSyncResult` | `POST /admin/odoo/sync/inventory`, `POST /admin/odoo/sync/all`, `inventory-updated` subscriber, `odoo-scheduled-sync` job |
| **`syncOrderToOdooWorkflow`** | `sync-order-to-odoo` | `sync-order` (`syncOrderStep`) | `{ orderId: string; manual?: boolean }` | `OdooOrderSyncResult` | `order-placed` subscriber (`order.placed`), `POST /admin/odoo/sync-order/:id`, Order Details widget |
| **`syncCustomersWithOdooWorkflow`**<br>*(Conceptual alias: `syncCustomerWithOdooWorkflow`)* | `sync-customers-with-odoo` | `sync-customers` (`syncCustomersStep`) | `{ direction?: OdooSyncDirection; trigger?: string }` | `OdooSyncResult` | `POST /admin/odoo/sync/customers`, `POST /admin/odoo/sync/all`, `customer-updated` subscriber, `odoo-scheduled-sync` job |
| **`reconcileOdooInventoryWorkflow`**<br>*(Conceptual alias: `reconcileInventoryDriftWorkflow`)* | `reconcile-odoo-inventory` | `reconcile-inventory` (`reconcileInventoryStep`) | `{ strategy?: "odoo_wins" \| "medusa_wins" \| "manual_conflict"; driftThreshold?: number; triggeredBy?: string }` | `OdooReconciliationResult` | `POST /admin/odoo/sync/reconciliation`, `odoo-reconciliation` cron job |
| **`replayOfflinePosTransactionWorkflow`**<br>*(Conceptual alias: `replayOfflinePosTransactionsWorkflow`)* | `replay-offline-pos-transaction` | `replay-pos-transaction` (`replayPosTransactionStep`) | `{ id: string; syncToOdoo?: boolean }` | `OfflinePosReplayResult` | `POST /admin/odoo/pos-transactions` (`action: "replay"`) |
| **Barcode Scan Resolution**<br>*(`resolveBarcodeScanWorkflow` / `odooService.resolveBarcode`)* | `resolve-barcode-scan` (`OdooModuleService.resolveBarcode`) | Cache → `ErpMapping` → Medusa DB → Odoo RPC | `{ barcode: string; context?: OdooBarcodeContext }` | `OdooBarcodeResolutionResult` | `POST /store/odoo/barcode`, `/app/odoo/barcode` Admin test bench |
| **Inbound Webhook Processing**<br>*(`processOdooWebhookWorkflow` / `odooService.processWebhookEvent`)* | `process-odoo-webhook` (`OdooModuleService.processWebhookEvent`) | HMAC Verify → Deduplicate `event_id` → Entity Sync | `{ rawBody: Buffer \| string; signatureHeader: string \| null; payload: OdooWebhookPayload }` | `OdooWebhookProcessResult` | `POST /hooks/odoo` |

---

## Detailed Workflow Behavior & Compensation

### 1. `syncProductsWithOdooWorkflow` (`sync-products-with-odoo`)
- **Execution**: Calls `odooService.syncProducts(container, input.direction, input.trigger ?? "workflow")`.
- **Import (`odoo_to_medusa`)**: Fetches `product.template` and `product.product` from Odoo, maps options/variants/prices/images, deduplicates handles (`slugifyHandle`), and reconciles variants non-destructively (preserving existing Medusa variant IDs matched by `ErpMapping`, `sku`, or `barcode`).
- **Export (`medusa_to_odoo`)**: Pushes Medusa products and variants to Odoo, computing `external_checksum` (SHA-256) so subscriber events do not re-trigger circular exports.
- **Compensation Context**: Returns `{ logId: res.logId }` in `StepResponse` and records any individual product failure in `mpo_sync_failure`.

### 2. `syncInventoryWithOdooWorkflow` (`sync-inventory-with-odoo`)
- **Execution**: Calls `odooService.syncInventory(container, input.direction, input.trigger ?? "workflow")`.
- **Multi-Warehouse Mapping**: Uses configured `locationMappings` (`medusaLocationId` ↔ `odooWarehouseId` / `odooStockLocationId`) and `qtyType` (`on_hand` vs `forecasted`).
- **Compensation Context**: Returns `{ logId: res.logId }` in `StepResponse`.

### 3. `syncOrderToOdooWorkflow` & `executeOrderSyncToOdoo` (`sync-order-to-odoo`)
- **Execution**:
  1. Queries the Medusa order graph (`id`, `email`, `currency_code`, `payment_status`, `fulfillment_status`, `metadata`, `customer.*`, `items.*`) via `ContainerRegistrationKeys.QUERY`.
  2. Invokes `odooService.syncOrderToOdoo({ order, manual })` to idempotently resolve/create `res.partner`, create `sale.order` + `sale.order.line`, optionally confirm the order, create & post `account.move` invoice (`all`, `paid`, or `fulfilled`), and register payment via `account.payment.register`.
  3. Writes `odoo_order_id` and `odoo_invoice_id` back to the Medusa order's `metadata` via `Modules.ORDER`.
- **Compensation Context**: Returns `{ orderId: input.orderId, odooOrderId: res.odooOrderId }` in `StepResponse`. If an order has already been synced (checked via `mpo_erp_mapping` or `metadata.odoo_order_id`), duplicate `sale.order` creation is prevented.

### 4. `syncCustomersWithOdooWorkflow` / `syncCustomerWithOdooWorkflow` (`sync-customers-with-odoo`)
- **Execution**: Calls `odooService.syncCustomers({ directionOverride: input.direction, trigger: input.trigger ?? "workflow" })`.
- **Matching**: Links Medusa customers and Odoo `res.partner` records by `mpo_erp_mapping` or email, syncing contact details, addresses, and B2B company/VAT numbers.

### 5. `reconcileOdooInventoryWorkflow` / `reconcileInventoryDriftWorkflow` (`reconcile-odoo-inventory`)
- **Execution**: Calls `odooService.reconcileInventory({ strategyOverride: input.strategy, driftThresholdOverride: input.driftThreshold, triggeredBy: input.triggeredBy ?? "workflow" })`.
- **Drift Handling**: Writes an `mpo_inventory_snapshot` record for every checked variant/warehouse pair and applies the active strategy (`odoo_wins`, `medusa_wins`, or `manual_conflict` creating an `mpo_conflict_resolution` item).

### 6. `replayOfflinePosTransactionWorkflow` / `replayOfflinePosTransactionsWorkflow` (`replay-offline-pos-transaction`)
- **Execution**: Calls `odooService.replayOfflinePosTransaction({ id: input.id, syncToOdoo: input.syncToOdoo })`.
- **Idempotency & Retry**: Checks `mpo_offline_pos_transaction.status`; if already `replayed`, returns the existing `medusa_order_id` and `odoo_order_id`. On failure, increments `replay_attempt_count`, records `replay_error`, and schedules `next_retry_at`.

### 7. Barcode Scan Resolution (`resolveBarcodeScanWorkflow` / `odooService.resolveBarcode`)
- **Execution**: Resolves `barcode` across `memory_cache` → `erp_mapping` → `medusa_db` → `odoo_db`, logs scan latency and source to `mpo_barcode_scan_log`, and increments `odooMetrics.recordBarcodeLookup`.

### 8. Inbound Webhook Processing (`processOdooWebhookWorkflow` / `odooService.processWebhookEvent`)
- **Execution**: Verifies HMAC-SHA256 signature via `verifyOdooWebhookSignature`, checks `mpo_webhook_event` by `event_id` for idempotent deduplication, and triggers the corresponding product, stock, customer, or order sync action.
