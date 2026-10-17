# Modules

Custom Medusa v2 modules providing the Odoo ERP data layer, multi-protocol RPC client, bidirectional sync engine, security utilities, and Prometheus observability registry.

```sh
modules/
├── odoo/                                      Primary Medusa module (ODOO_MODULE = "odoo")
│   ├── index.ts                               Exports ODOO_MODULE, OdooModuleService, and Module("odoo", { service: OdooModuleService })
│   ├── service.ts                             OdooModuleService extending MedusaService(OdooModels)
│   ├── types.ts                               Domain types, section configuration interfaces, and DTOs
│   ├── client/
│   │   └── odoo-client.ts                     Zero-dependency multi-protocol OdooClient (JSON-RPC 2.0 & Odoo 19+ JSON-2)
│   ├── models/
│   │   └── index.ts                           10 DML data models with `mpo_` table prefix
│   ├── migrations/
│   │   └── Migration20260412000000.ts         MikroORM migration creating and indexing all 10 `mpo_*` tables
│   └── utils/
│       ├── security.ts                        SSRF guard, secret redactor, timing-safe HMAC verifier & SHA-256 checksummer
│       └── metrics.ts                         OpenMetrics / Prometheus metrics registry (`odooMetrics`)
└── odoo-sync/                                 Compatibility module alias for `@bambiste/medusa-odoo`
    └── index.ts                               Re-exports `OdooModuleService` and `Module(ODOO_MODULE, { service: OdooModuleService })`
```

---

## Primary Module (`modules/odoo`) & Compatibility Alias (`modules/odoo-sync`)

- **Service Token**: `ODOO_MODULE = "odoo"` (also exports `ODOO_SYNC_MODULE = "odoo_sync"`).
- **Registration in `medusa-config.ts`**:
  - Standard registration: `resolve: "@vicacha-devs/medusa-plugin-odoo/modules/odoo"`
  - Drop-in compatibility alias for `@bambiste/medusa-odoo`: `resolve: "@vicacha-devs/medusa-plugin-odoo/modules/odoo-sync"`
- **Resolving from Medusa Container**:

```ts
import { ODOO_MODULE, type OdooModuleService } from "@vicacha-devs/medusa-plugin-odoo"

const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
```

---

## Data Models (`src/modules/odoo/models/index.ts`)

All 10 models use the `mpo_` table prefix to prevent collisions with Medusa core or third-party tables:

| Model Name | Table Name | Indexed Columns | Description |
| :--- | :--- | :--- | :--- |
| `OdooSetting` | `mpo_setting` | `IDX_mpo_setting_key` (`key` unique) | Key-value JSONB configuration store for connection settings (`connection`) and section rules (`section:product`, `section:inventory`, `section:orders`, `section:customers`, `section:reconciliation`, `section:webhooks`, `section:pos`). |
| `ErpMapping` | `mpo_erp_mapping` | `IDX_mpo_erp_mapping_entity_medusa` (`entity_type`, `medusa_id`), `IDX_mpo_erp_mapping_entity_odoo` (`entity_type`, `odoo_id`) | Bidirectional ID mapping (`medusa_id` ↔ `odoo_id`) with `odoo_model`, `sync_direction`, `external_checksum` (SHA-256), `status`, `last_synced_at`, and `metadata`. |
| `ErpSyncLog` | `mpo_sync_log` | `IDX_mpo_sync_log_entity` (`entity_type`), `IDX_mpo_sync_log_status` (`status`) | Tracks every sync run with `direction`, `trigger`, `status`, `created_count`, `updated_count`, `skipped_count`, `failed_count`, `duration_ms`, and `error_details`. |
| `ErpSyncFailure` | `mpo_sync_failure` | `IDX_mpo_sync_failure_resolved` (`resolved`), `IDX_mpo_sync_failure_entity` (`entity_type`) | Dead-letter queue capturing failed entity sync attempts, error messages, payloads, attempt counts, and resolution audit fields. |
| `ErpInventorySnapshot` | `mpo_inventory_snapshot` | `IDX_mpo_inv_snapshot_variant` (`variant_id`) | Point-in-time comparison of `quantity_medusa` vs `quantity_odoo` (`delta`, `reconciled`, `resolution_action`, `snapshot_at`). |
| `ErpReconciliationLog` | `mpo_reconciliation_log` | `IDX_mpo_reconcil_log_status` (`status`) | Audit log for drift reconciliation runs (`strategy`, `drift_threshold`, `checked_count`, `matched_count`, `drifted_count`, `fixed_count`, `conflict_count`). |
| `ErpConflictResolution` | `mpo_conflict_resolution` | `IDX_mpo_conflict_status` (`status`) | Tracks unresolved (`open`) and `resolved` stock/field conflicts between Medusa and Odoo for manual or automated resolution. |
| `BarcodeScanLog` | `mpo_barcode_scan_log` | `IDX_mpo_barcode_scan_code` (`barcode`) | Records POS & warehouse barcode lookups with `context` (`pos`, `warehouse`, `receiving`, `stocktake`), `source`, `resolution_status`, and `latency_ms`. |
| `OfflinePosTransaction` | `mpo_offline_pos_transaction` | `IDX_mpo_offline_pos_ext_id` (`external_transaction_id` unique), `IDX_mpo_offline_pos_status` (`status`) | Durable queue for offline POS checkouts with idempotent replay tracking (`medusa_order_id`, `odoo_order_id`, `replay_attempt_count`, `replay_error`). |
| `OdooWebhookEvent` | `mpo_webhook_event` | `IDX_mpo_webhook_event_id` (`event_id` unique) | Idempotency ledger ensuring each inbound Odoo webhook (`event_id`) is processed exactly once. |

---

## Multi-Protocol `OdooClient` (`src/modules/odoo/client/odoo-client.ts`)

`OdooClient` is a zero-external-dependency TypeScript RPC client supporting both Odoo 14–18 and Odoo 19+:

1. **JSON-RPC 2.0 (`protocol: "jsonrpc"`, default for Odoo 14–18)**:
   - Authenticates via `POST {url}/jsonrpc` (`service: "common"`, `method: "authenticate"`, `args: [db, username, secret, {}]`).
   - Executes ORM methods via `POST {url}/jsonrpc` (`service: "object"`, `method: "execute_kw"`, `args: [db, uid, secret, model, method, args, kwargs]`).
2. **Odoo 19+ JSON-2 API (`protocol: "json2"`)**:
   - Calls `POST {url}/json/2/{model}/{method}` directly with `Authorization: Bearer {apiKey}` and `X-Odoo-Database: {db}`.
3. **Resilience & Observability**:
   - **SSRF Validation**: Validates `config.url` in the constructor via `validateSafeOdooUrl`.
   - **Token-Bucket Rate Limiter**: Enforces `rateLimitPerSec` (default `20` req/s) per 1-second sliding window.
   - **Circuit Breaker**: Tracks consecutive failures; trips to `open` after `circuitThreshold` (default `5`), transitions to `half-open` after `circuitResetMs` (default `60000` ms), and closes on recovery.
   - **Exponential Backoff Retries**: Retries transient HTTP `5xx` / `429` / network timeouts up to `maxRetries` (default `3`).
   - **Prometheus Telemetry**: Reports every RPC call (`protocol`, `model`, `method`, `status`) and circuit state change to `odooMetrics`.

---

## Key Methods on `OdooModuleService` (`src/modules/odoo/service.ts`)

| Category | Method | Description |
| :--- | :--- | :--- |
| **Configuration & Health** | `getConnectionConfig()`, `getRedactedConnectionConfig()`, `saveConnectionConfig(input)`, `verifyConnection(override?)`, `getStatusOverview()` | Manages connection credentials, redacts secrets, tests live Odoo connectivity, and reports health metrics. |
| **Section Settings** | `getSectionSettings<T>(section)`, `saveSectionSettings<T>(section, partial)` | Reads and updates settings for `product`, `inventory`, `orders`, `customers`, `reconciliation`, `webhooks`, and `pos`. |
| **Products & Variants** | `syncProducts(container, direction?, trigger?)`, `importProductsFromOdoo(container, trigger?)`, `exportProductsToOdoo(container, productIds?, trigger?)` | Bidirectional `product.template` / `product.product` ↔ Medusa product & variant synchronization with non-destructive variant matching. |
| **Inventory & Reconciliation** | `syncInventory(container, direction?, trigger?)`, `importInventoryFromOdoo(container, trigger?)`, `exportInventoryToOdoo(container, variantIds?, trigger?)`, `reconcileInventory(options?)` | Multi-warehouse stock sync (`on_hand` / `forecasted`) and automated drift reconciliation (`odoo_wins`, `medusa_wins`, `manual_conflict`). |
| **Orders, Invoices & Payments** | `syncOrderToOdoo({ order, manual? })` | Idempotently creates/updates Odoo `sale.order`, confirms order, creates/posts `account.move` invoice, and registers payment. |
| **Customers** | `syncCustomers({ directionOverride?, trigger? })` | Bidirectional `res.partner` ↔ Medusa customer synchronization. |
| **Mappings, Failures & Conflicts** | `upsertMapping(input)`, `resolveFailure(input)`, `resolveConflict(input)` | Manages `ErpMapping` records, resolves dead-letter failures, and settles inventory conflicts. |
| **POS & Webhooks** | `resolveBarcode({ barcode, context? })`, `enqueueOfflinePosTransaction(input)`, `replayOfflinePosTransaction(input)`, `processWebhookEvent(input)` | Sub-10ms barcode resolution, offline POS queue/replay, and HMAC-verified inbound webhook processing. |
