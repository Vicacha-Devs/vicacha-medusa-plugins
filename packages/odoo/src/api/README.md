# API Routes

File-based REST routes across three surfaces (`admin`, `store`, and `hooks`), following Medusa v2's `src/api/<surface>/<path>/route.ts` convention.

```sh
api/
├── validators.ts                                Zod schemas & inferred input types for all request payloads
├── middlewares.ts                               Global middleware registration & preserveRawBody webhook configuration
├── admin/
│   ├── plugin/
│   │   └── route.ts                             GET /admin/plugin — Admin plugin discovery route
│   └── odoo/
│       ├── status/
│       │   └── route.ts                         GET /admin/odoo/status — Connection health, circuit state & counters
│       ├── config/
│       │   └── route.ts                         GET & POST /admin/odoo/config — Read (redacted) & save connection config
│       ├── verify-connection/
│       │   └── route.ts                         POST /admin/odoo/verify-connection — Live RPC handshake & discovery
│       ├── sections/
│       │   └── [section]/
│       │       └── route.ts                     GET & POST /admin/odoo/sections/:section — Per-section sync settings
│       ├── options/
│       │   └── route.ts                         GET /admin/odoo/options — Medusa locations/channels + Odoo warehouses/journals
│       ├── sync/
│       │   └── [entity]/
│       │       └── route.ts                     POST /admin/odoo/sync/:entity — Trigger manual sync or drift reconciliation
│       ├── sync-order/
│       │   └── [id]/
│       │       └── route.ts                     POST /admin/odoo/sync-order/:id — Sync specific order, invoice & payment
│       ├── mappings/
│       │   └── route.ts                         GET & POST /admin/odoo/mappings — List & upsert ErpMapping records
│       ├── logs/
│       │   └── route.ts                         GET /admin/odoo/logs — Sync logs, reconciliation logs & stock snapshots
│       ├── failures/
│       │   └── route.ts                         GET & POST /admin/odoo/failures — List & resolve dead-letter sync failures
│       ├── conflicts/
│       │   └── route.ts                         GET & POST /admin/odoo/conflicts — List & resolve inventory drift conflicts
│       ├── pos-transactions/
│       │   └── route.ts                         GET & POST /admin/odoo/pos-transactions — Enqueue & replay offline POS orders
│       └── metrics/
│           └── route.ts                         GET /admin/odoo/metrics — JSON & Prometheus (?format=prometheus) metrics
├── store/
│   ├── plugin/
│   │   └── route.ts                             GET /store/plugin — Store plugin discovery route
│   └── odoo/
│       └── barcode/
│           └── route.ts                         POST /store/odoo/barcode — Fast POS & warehouse barcode/EAN-13/SKU resolver
└── hooks/
    └── odoo/
        └── route.ts                             POST /hooks/odoo — HMAC-SHA256 verified inbound Odoo webhook receiver
```

---

## Request Validation (`validators.ts`)

All request payload schemas are defined in `src/api/validators.ts` using `z` from `@medusajs/framework/zod` and re-exported by `src/api/middlewares.ts`:

| Schema Name | Exported Type | Attached Route | Validated Fields |
| :--- | :--- | :--- | :--- |
| `OdooConfigSchema` | `OdooConfigInput` | `POST /admin/odoo/config` | `url`, `db`, `username`, `password?`, `apiKey?`, `protocol?` (`jsonrpc` \| `json2`), `companyId?`, `timeoutMs?`, `maxRetries?`, `rateLimitPerSec?`, `allowPrivateNetwork?`, `webhookSecret?` |
| `OdooVerifyConnectionSchema` | `OdooVerifyConnectionInput` | `POST /admin/odoo/verify-connection` | `OdooConfigSchema.partial()` — allows testing unsaved form overrides or falling back to stored credentials |
| `OdooTriggerSyncSchema` | `OdooTriggerSyncInput` | `POST /admin/odoo/sync/:entity` | `direction?` (`odoo_to_medusa` \| `medusa_to_odoo` \| `bidirectional`), `strategy?` (`odoo_wins` \| `medusa_wins` \| `manual_conflict`), `driftThreshold?` |
| `OdooUpsertMappingSchema` | `OdooUpsertMappingInput` | `POST /admin/odoo/mappings` | `entityType` (`product` \| `variant` \| `inventory` \| `order` \| `invoice` \| `customer` \| `warehouse` \| `category`), `medusaId`, `odooId`, `direction?`, `odooModel?`, `metadata?` |
| `OdooResolveFailureSchema` | `OdooResolveFailureInput` | `POST /admin/odoo/failures` | `id`, `resolvedBy?` |
| `OdooResolveConflictSchema` | `OdooResolveConflictInput` | `POST /admin/odoo/conflicts` | `id`, `resolution` (`odoo_wins` \| `medusa_wins` \| `custom`), `customValue?`, `resolvedBy?` |
| `OdooPosTransactionActionSchema` | `OdooPosTransactionActionInput` | `POST /admin/odoo/pos-transactions` | `action` (`enqueue` \| `replay`), `id?`, `externalTransactionId?`, `customerId?`, `customerEmail?`, `currency?`, `totalCents?`, `discountCents?`, `items?`, `syncToOdoo?` |
| `OdooBarcodeLookupSchema` | `OdooBarcodeLookupInput` | `POST /store/odoo/barcode` | `barcode` (`1..128` chars), `context?` (`pos` \| `warehouse` \| `receiving` \| `stocktake`) |
| `OdooWebhookBodySchema` | `OdooWebhookBodyInput` | `POST /hooks/odoo` | `event_id?`, `event`, `model?`, `record_id?`, `data`, `timestamp?` |

---

## Middlewares & Raw Body Webhook Verification (`middlewares.ts`)

`src/api/middlewares.ts` registers `validateAndTransformBody` on all mutating `POST` routes and configures `bodyParser: { preserveRawBody: true }` specifically on `/hooks/odoo`:

```ts
{
  matcher: "/hooks/odoo",
  method: "POST",
  bodyParser: { preserveRawBody: true },
  middlewares: [validateAndTransformBody(OdooWebhookBodySchema)],
}
```

Preserving `req.rawBody` ensures that `POST /hooks/odoo` (`src/api/hooks/odoo/route.ts`) can pass the exact unparsed byte buffer to `verifyOdooWebhookSignature(rawBody, signatureHeader, secret)` (`crypto.timingSafeEqual`) before processing the validated JSON payload.

---

## Admin Endpoints (`/admin/odoo/*`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/admin/odoo/status` | Returns `OdooStatusOverview` (`status`, `protocol`, `circuitState`, `serverVersion`, `totalMappings`, `openFailures`, `openConflicts`, `pendingPosTransactions`, `recentLogsCount`). |
| `GET` | `/admin/odoo/config` | Returns `{ config: OdooRedactedConnectionConfig }` with `password`, `apiKey`, and `webhookSecret` redacted via `redactOdooConfig`. |
| `POST` | `/admin/odoo/config` | Validates URL via `validateSafeOdooUrl`, merges credentials (retaining existing secrets if blank), and persists to `mpo_setting`. |
| `POST` | `/admin/odoo/verify-connection` | Performs live authentication against Odoo (`jsonrpc` or `json2`) and discovers `companies`, `warehouses`, `journals`, and `categories`. |
| `GET` | `/admin/odoo/sections/:section` | Retrieves settings for `:section` (`product`, `inventory`, `orders`, `customers`, `reconciliation`, `webhooks`, `pos`). |
| `POST` | `/admin/odoo/sections/:section` | Updates and persists settings for `:section` in `mpo_setting`. |
| `GET` | `/admin/odoo/options` | Returns Medusa `stockLocations`, `collections`, and `salesChannels` plus Odoo `companies`, `warehouses`, `journals`, and `categories`. |
| `POST` | `/admin/odoo/sync/:entity` | Executes manual synchronization for `:entity` (`products`, `inventory`, `customers`, `reconciliation`, or `all`). |
| `POST` | `/admin/odoo/sync-order/:id` | Runs `executeOrderSyncToOdoo` for order `:id`, creating/updating Odoo `sale.order`, optional `account.move` invoice, and payment. |
| `GET` | `/admin/odoo/mappings` | Lists `ErpMapping` records filtered by query params `entity_type` and `medusa_id`. |
| `POST` | `/admin/odoo/mappings` | Upserts an `ErpMapping` link between `medusaId` and `odooId`. |
| `GET` | `/admin/odoo/logs` | Returns `{ logs, reconciliationLogs, snapshots }` from `mpo_sync_log`, `mpo_reconciliation_log`, and `mpo_inventory_snapshot`. |
| `GET` | `/admin/odoo/failures` | Lists `ErpSyncFailure` rows filtered by optional `?resolved=true\|false`. |
| `POST` | `/admin/odoo/failures` | Marks a dead-letter `ErpSyncFailure` record as resolved (`resolved: true`, `resolved_at`, `resolved_by`). |
| `GET` | `/admin/odoo/conflicts` | Lists `ErpConflictResolution` records filtered by optional `?status=open\|resolved`. |
| `POST` | `/admin/odoo/conflicts` | Resolves an inventory conflict (`odoo_wins`, `medusa_wins`, or `custom`) and updates stock accordingly. |
| `GET` | `/admin/odoo/pos-transactions` | Lists queued and replayed `OfflinePosTransaction` records. |
| `POST` | `/admin/odoo/pos-transactions` | Enqueues a new offline POS transaction (`action: "enqueue"`) or replays an existing one (`action: "replay"`). |
| `GET` | `/admin/odoo/metrics` | Returns OpenMetrics/Prometheus text (`text/plain; version=0.0.4`) when `?format=prometheus` is passed, or `{ metrics, prometheus }` JSON otherwise. |
| `GET` | `/admin/plugin` | Returns plugin metadata health check. |

---

## Store & Webhook Endpoints

| Method | Endpoint | Surface | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/store/odoo/barcode` | Store / POS | Resolves `barcode` in `pos`, `warehouse`, `receiving`, or `stocktake` context via memory cache → `ErpMapping` → Medusa DB → Odoo RPC. Returns HTTP `200` if found or `404` if not found. |
| `GET` | `/store/plugin` | Store | Returns storefront plugin health status. |
| `POST` | `/hooks/odoo` | Webhook | Verifies `x-odoo-signature` / `x-webhook-signature` against `req.rawBody`, records idempotent `OdooWebhookEvent` (`mpo_webhook_event`), and processes product/stock/customer/order updates. Returns `401` on invalid signature. |
