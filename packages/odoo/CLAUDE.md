# CLAUDE.md — `@vicacha-devs/medusa-plugin-odoo`

## Project Overview

`@vicacha-devs/medusa-plugin-odoo` is a self-contained, bidirectional **Odoo ERP (Odoo 14–19+ JSON-RPC 2.0 & JSON-2 API) integration plugin for Medusa v2 (`^2.21.0`)**.

It unifies and supersedes `@bambiste/medusa-odoo` and `@techmarbles/medusa-odoo-connector` without requiring any external SaaS proxy or mandatory Redis dependency:
1. **Multi-Protocol Odoo RPC Client (`src/modules/odoo/client/odoo-client.ts`)**: Native JSON-RPC 2.0 (`/jsonrpc` `common` & `object.execute_kw` for Odoo 14–18) and Odoo 19+ JSON-2 API (`/json/2/{model}/{method}`) with SSRF validation (`validateSafeOdooUrl`), token-bucket rate limiting, circuit breaker (`closed` / `open` / `half-open`), and exponential backoff retries.
2. **DML Persistence (`src/modules/odoo/models/index.ts`)**: 10 database models (`mpo_setting`, `mpo_erp_mapping`, `mpo_sync_log`, `mpo_sync_failure`, `mpo_inventory_snapshot`, `mpo_reconciliation_log`, `mpo_conflict_resolution`, `mpo_barcode_scan_log`, `mpo_offline_pos_transaction`, `mpo_webhook_event`).
3. **Bidirectional ERP Sync & Workflows (`src/modules/odoo/service.ts` & `src/workflows/index.ts`)**:
   - **Products & Variants**: Two-way `product.template` / `product.product` ↔ Medusa Product & ProductVariant with SKU/barcode mapping, circular-loop prevention via SHA-256 checksums, handle deduplication, and non-destructive variant reconciliation.
   - **Multi-Warehouse Inventory & Drift Reconciliation**: Two-way stock sync mapped per Medusa StockLocation ↔ Odoo `stock.warehouse` (`lot_stock_id`), `on_hand` vs `forecasted` quantity modes, plus automated drift reconciliation (`odoo_wins`, `medusa_wins`, `manual_conflict`) with snapshots and conflict resolution.
   - **Orders, Invoicing & Payments**: Idempotent Medusa Order → Odoo `sale.order` + `sale.order.line`, optional `account.move` invoice creation & posting (`all`, `paid`, `fulfilled`), and `account.payment.register` payment registration.
   - **Customers / Partners**: Two-way `res.partner` ↔ Medusa Customer sync matched by email and ERP mappings.
   - **POS & Warehouse Barcode Resolver + Offline POS Replay**: Fast barcode/EAN13/SKU lookup (`pos`, `warehouse`, `receiving`, `stocktake`) with TTL caching + offline POS transaction queue & replay.
   - **Webhooks & Prometheus Metrics**: Timing-safe HMAC-SHA256 verified `/hooks/odoo` endpoint + OpenMetrics/Prometheus `/admin/odoo/metrics` exposition.

---

## Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
| :--- | :--- | :--- |
| `medusa-plugin-odoo` | `src/index.ts` | Root export (`ODOO_MODULE`, `OdooModuleService`, `OdooClient`, workflows, validators, SDK, hooks, types, `adminI18n`) |
| `medusa-plugin-odoo/modules/odoo` | `src/modules/odoo/index.ts` | Primary Medusa module (`Module("odoo", { service: OdooModuleService })`) |
| `medusa-plugin-odoo/modules/odoo-sync` | `src/modules/odoo-sync/index.ts` | Compatibility alias for `@bambiste/medusa-odoo` (`Module("odoo", { service: OdooModuleService })`) |
| `medusa-plugin-odoo/workflows` | `src/workflows/index.ts` | Medusa v2 workflows (`syncProductsWithOdooWorkflow`, `syncInventoryWithOdooWorkflow`, `syncOrderToOdooWorkflow`, etc.) |
| `medusa-plugin-odoo/sdk` | `src/sdk/index.ts` | Typed client SDK (`createOdooSdk`, `defaultOdooSdk`, `odooQueryKeys`, `OdooSdkError`) |
| `medusa-plugin-odoo/hooks` | `src/hooks/index.ts` | React query & mutation hooks for Admin UI & storefront |
| `medusa-plugin-odoo/types` | `src/types/index.ts` | Barrel re-export of all TypeScript interfaces and type aliases |

---

## Complete File-by-File Codebase Map

```text
src/
├── index.ts                                                Root barrel re-exporting module, workflows, validators, SDK, hooks, types, and adminI18n
├── types/
│   └── index.ts                                            Public TypeScript types barrel re-exporting src/modules/odoo/types.ts
├── modules/
│   ├── README.md                                           Architecture & usage docs for the odoo and odoo-sync modules
│   ├── odoo/
│   │   ├── index.ts                                        Defines Module("odoo", { service: OdooModuleService }) and re-exports client/utils/types
│   │   ├── service.ts                                      OdooModuleService extending MedusaService(OdooModels) — config, client cache, mapping/log/failure helpers; domain methods are delegated to the modules below
│   │   ├── settings-defaults.ts                            buildSectionDefaults(options) — default values per settings section
│   │   ├── webhooks.ts                                     processWebhookEvent (HMAC verification, dedupe, auto-sync dispatch)
│   │   ├── sync/                                           Domain logic written as `function (this: OdooModuleService, ...)` and bound onto the service class
│   │   │   ├── products.ts                                 import/export/sync/archive products
│   │   │   ├── inventory.ts                                import/export/sync stock levels
│   │   │   ├── reconciliation.ts                           reconcileInventory & resolveConflict
│   │   │   ├── orders.ts                                   syncOrderToOdoo (invoice/payment) & cancelOrderInOdoo
│   │   │   └── customers.ts                                two-way res.partner ↔ Customer sync
│   │   ├── pos/
│   │   │   ├── barcode.ts                                  resolveBarcode with bounded TTL cache, invalidate & warm
│   │   │   └── offline.ts                                  offline POS queue & replay
│   │   ├── types.ts                                        All domain interfaces, section setting types, DTOs, and constants (ODOO_MODULE, ODOO_SYNC_MODULE)
│   │   ├── client/
│   │   │   └── odoo-client.ts                              Multi-protocol OdooClient (JSON-RPC 2.0 & Odoo 19+ JSON-2) with rate limiter, circuit breaker & retries
│   │   ├── models/
│   │   │   └── index.ts                                    10 DML models with mpo_ prefix (OdooSetting, ErpMapping, ErpSyncLog, ErpSyncFailure, etc.)
│   │   ├── migrations/
│   │   │   └── Migration20260412000000.ts                  MikroORM migration creating and indexing all 10 mpo_* tables
│   │   └── utils/
│   │       ├── errors.ts                               errorMessage(err) helper
│   │       ├── security.ts                                 validateSafeOdooUrl, redactSecret, redactOdooConfig, verifyOdooWebhookSignature, computeExternalChecksum, slugifyHandle
│   │       └── metrics.ts                                  OdooMetricsRegistry (odooMetrics) tracking counters/gauges and rendering OpenMetrics/Prometheus text
│   └── odoo-sync/
│       └── index.ts                                        Compatibility module alias for @bambiste/medusa-odoo resolving to OdooModuleService
├── workflows/
│   ├── README.md                                           Documentation for all workflows, steps, triggers, and compensation
│   └── index.ts                                            Medusa v2 workflows (syncProductsWithOdooWorkflow, syncInventoryWithOdooWorkflow, syncOrderToOdooWorkflow, syncCustomersWithOdooWorkflow, reconcileOdooInventoryWorkflow, replayOfflinePosTransactionWorkflow, executeOrderSyncToOdoo)
├── subscribers/
│   ├── README.md                                           Documentation for event subscribers and circular-sync loop prevention
│   ├── order-placed.ts                                     Listens to order.placed → syncs order, invoice & payment to Odoo
│   ├── product-updated.ts                                  Listens to product.created & product.updated → exports products when enabled
│   ├── inventory-updated.ts                                Listens to inventory-level.updated → exports stock levels when enabled
│   └── customer-updated.ts                                 Listens to customer.created & customer.updated → syncs customer to res.partner
├── jobs/
│   ├── README.md                                           Documentation for background cron jobs
│   ├── odoo-scheduled-sync.ts                              Cron job (odoo-scheduled-sync-job) running products, inventory & customer sync
│   └── odoo-reconciliation.ts                              Cron job (odoo-inventory-reconciliation-job) running automated inventory drift reconciliation
├── api/
│   ├── README.md                                           REST API reference, Zod schemas, and middleware documentation
│   ├── validators.ts                                       9 Zod request schemas (OdooConfigSchema, OdooTriggerSyncSchema, OdooWebhookBodySchema, etc.)
│   ├── middlewares.ts                                      Route body validation & preserveRawBody: true on POST /hooks/odoo
│   ├── admin/
│   │   ├── plugin/route.ts                                 GET /admin/plugin health metadata route
│   │   └── odoo/
│   │       ├── status/route.ts                             GET /admin/odoo/status
│   │       ├── config/route.ts                             GET & POST /admin/odoo/config
│   │       ├── verify-connection/route.ts                  POST /admin/odoo/verify-connection
│   │       ├── sections/[section]/route.ts                 GET & POST /admin/odoo/sections/:section
│   │       ├── options/route.ts                            GET /admin/odoo/options
│   │       ├── sync/[entity]/route.ts                      POST /admin/odoo/sync/:entity
│   │       ├── sync-order/[id]/route.ts                    POST /admin/odoo/sync-order/:id
│   │       ├── mappings/route.ts                           GET & POST /admin/odoo/mappings
│   │       ├── logs/route.ts                               GET /admin/odoo/logs
│   │       ├── failures/route.ts                           GET & POST /admin/odoo/failures
│   │       ├── conflicts/route.ts                          GET & POST /admin/odoo/conflicts
│   │       ├── pos-transactions/route.ts                   GET & POST /admin/odoo/pos-transactions
│   │       └── metrics/route.ts                            GET /admin/odoo/metrics (JSON & ?format=prometheus)
│   ├── store/
│   │   ├── plugin/route.ts                                 GET /store/plugin health metadata route
│   │   └── odoo/
│   │       └── barcode/route.ts                            POST /store/odoo/barcode (POS & warehouse barcode resolver)
│   └── hooks/
│       └── odoo/route.ts                                   POST /hooks/odoo (HMAC-SHA256 verified inbound Odoo webhook receiver)
├── sdk/
│   ├── index.ts                                            SDK barrel export
│   ├── client.ts                                           createOdooSdk, defaultOdooSdk, and OdooSdkError
│   └── query-keys.ts                                       odooQueryKeys factory for cache key management
├── hooks/
│   ├── index.ts                                            17 typed React query & mutation hooks (useOdooStatus, useTriggerOdooSync, useBarcodeLookup, etc.)
│   └── use-sdk-primitives.ts                               useOdooQuery, useOdooMutation, and invalidateOdooQueries client cache primitives
├── links/
│   └── README.md                                           Documentation on ErpMapping (mpo_erp_mapping) cross-system entity linking
├── providers/
│   └── README.md                                           Documentation on dual-protocol OdooClient RPC providers and odoo-sync compatibility alias
├── admin/
│   ├── README.md                                           Admin UI architecture, routes, widgets, hooks & components documentation
│   ├── tsconfig.json                                       Admin TypeScript configuration (bundler resolution, react-jsx)
│   ├── vite-env.d.ts                                       Vite client type declarations
│   ├── i18n/
│   │   ├── README.md                                       Admin i18n guide (10 locales, RTL support, key structure)
│   │   ├── index.ts                                        Exports SUPPORTED_UI_LOCALES and 10-locale translation bundle under translation & odoo namespaces
│   │   └── json/
│   │       ├── ar.json                                     Arabic (RTL) translations
│   │       ├── de.json                                     German translations
│   │       ├── en.json                                     English (default) translations
│   │       ├── es.json                                     Spanish translations
│   │       ├── fr.json                                     French translations
│   │       ├── it.json                                     Italian translations
│   │       ├── nl.json                                     Dutch translations
│   │       ├── pl.json                                     Polish translations
│   │       ├── pt.json                                     Portuguese translations
│   │       └── tr.json                                     Turkish translations
│   ├── hooks/
│   │   ├── use-odoo-dashboard.ts                           Orchestration hook for all 5 Admin routes (queries, mutations, form state, handlers)
│   │   └── use-order-odoo-status.ts                        Hook for the Order Details Odoo ERP status widget
│   ├── components/                                         18 modular UI component files (all < 170 lines each)
│   │   ├── index.ts                                        Barrel export for all Admin components
│   │   ├── odoo-header.tsx                                 Top header with connection StatusBadge, protocol/circuit badges, locale selector & Sync All button
│   │   ├── overview-cards.tsx                              StatCard (KPIs with Skeleton loading) and NavigationCard (sub-route cards)
│   │   ├── overview-tab.tsx                                OverviewTab manual sync control panel
│   │   ├── connection-tab.tsx                              ConnectionTab credentials form (KeyboundForm, protocol selector, private-network Switch)
│   │   ├── connection-security-section.tsx                 ConnectionSecuritySideSection displaying SSRF, redaction & circuit-breaker posture
│   │   ├── settings-tab.tsx                                SettingsTab composite view combining all 4 sync rule sections
│   │   ├── product-settings-section.tsx                    ProductSyncSettingsSection (enableProductSync, autoPublish, syncImages)
│   │   ├── inventory-settings-section.tsx                  InventorySyncSettingsSection (enableStock, forecasted qty toggle, warehouse summary)
│   │   ├── order-settings-section.tsx                      OrderSyncSettingsSection (orderSync, exportInvoice, createPayment)
│   │   ├── reconciliation-settings-section.tsx             ReconciliationSettingsSection (enableScheduledReconciliation, active strategy)
│   │   ├── logs-tab.tsx                                    LogsTab composite view combining failures, conflicts & recent sync runs
│   │   ├── failures-section.tsx                            SyncFailuresSection dead-letter queue table with Mark Resolved action
│   │   ├── conflicts-section.tsx                           DriftConflictsSection table with Odoo Wins / Medusa Wins resolution actions
│   │   ├── sync-logs-table.tsx                             RecentSyncRunsSection table showing entity, direction, status, counts & duration
│   │   ├── barcode-tab.tsx                                 BarcodeLookupSection & BarcodeTab interactive scanner / lookup test bench
│   │   ├── pos-transactions-section.tsx                    PosTransactionsSection table displaying queued/replayed offline POS transactions
│   │   └── order-odoo-summary.tsx                          OrderOdooSummary presentational card for the Order Details widget
│   ├── routes/
│   │   └── odoo/
│   │       ├── page.tsx                                    /app/odoo — Main Odoo ERP overview dashboard
│   │       ├── connection/page.tsx                         /app/odoo/connection — Connection & Protocol configuration page
│   │       ├── settings/page.tsx                           /app/odoo/settings — Entity Sync Rules configuration page
│   │       ├── logs/page.tsx                               /app/odoo/logs — Logs, Dead-Letter Failures & Drift Conflicts page
│   │       └── barcode/page.tsx                            /app/odoo/barcode — POS Barcode Resolver & Offline POS Queue page
│   └── widgets/
│       ├── order-odoo-widget.tsx                           Widget injected into order.details.after
│       └── product-odoo-widget.tsx                         Widget injected into product.details.after
└── __tests__/
    ├── register-ts-resolver.mjs                            Node module customization hook for running .ts specs directly
    ├── medusa-shim.mjs                                     Lightweight test shim for Medusa framework imports
    └── odoo-plugin.spec.ts                                 Comprehensive unit & integration test suite (RPC client, security, sync, reconciliation, POS, webhooks)
```

---

## Commands

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Test**: `npm test` (`node --import ./src/__tests__/register-ts-resolver.mjs --test src/__tests__/*.spec.ts`)
- **Build**: `npm run build` (`medusa plugin:build && tsc-alias -p tsconfig.json`)
- **Dev Watch**: `npm run dev` (`medusa plugin:develop`)

---

## Strict Medusa v2 & Security Engineering Rules

1. **SSRF Protection**: Every Odoo URL must pass through `validateSafeOdooUrl` (`src/modules/odoo/utils/security.ts`), which blocks non-HTTP(S) protocols, embedded URL credentials, cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`, `100.100.100.200`, `fd00:ec2::254`), and loopback/private network ranges unless `allowPrivateNetwork: true` is explicitly configured.
2. **Secret Redaction**: Never return raw secrets in API responses. Always pass connection configs through `redactOdooConfig` before returning from `/admin/odoo/config`.
3. **Timing-Safe Webhook Verification**: Always preserve `rawBody` (`bodyParser: { preserveRawBody: true }`) on `/hooks/odoo` and verify `x-odoo-signature` / `x-webhook-signature` with `verifyOdooWebhookSignature` (`crypto.timingSafeEqual`).
4. **Circular Sync Loop Prevention**: Before exporting a Medusa entity triggered by a subscriber, compare its computed SHA-256 payload hash (`computeExternalChecksum`) against `mpo_erp_mapping.external_checksum` to avoid infinite Medusa ↔ Odoo ping-pong loops.
5. **Type-Only Imports**: Always use `import type { ... }` for TypeScript interfaces and type aliases so Node's native TypeScript test runner executes cleanly without runtime circular-import or missing-symbol errors.
6. **Dedicated API Validators**: All Zod request schemas live in `src/api/validators.ts` (importing `z` from `@medusajs/framework/zod`) and are attached via `validateAndTransformBody` in `src/api/middlewares.ts`.
7. **Decoupled Admin UI (`< 170` lines per component)**: Route files in `src/admin/routes/odoo/**/page.tsx` and widgets in `src/admin/widgets/*.tsx` must remain thin shells delegating state/queries/mutations to `src/admin/hooks/` and rendering modular components from `src/admin/components/` (each strictly `< 170` lines).
