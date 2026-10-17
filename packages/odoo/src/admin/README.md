# Admin

Medusa Admin extension — routes, widgets, modular components, data-fetching hooks, and 10-locale internationalization for `@vicacha-devs/medusa-plugin-odoo`.

```sh
admin/
├── tsconfig.json                              TypeScript config (moduleResolution: bundler, jsx: react-jsx, noEmit: true)
├── vite-env.d.ts                              Vite client type declarations
├── i18n/                                      react-i18next setup and 10 locale JSON bundles (see i18n/README.md)
│   ├── index.ts                               Exports SUPPORTED_UI_LOCALES and 10-locale translation map
│   └── json/                                  ar, de, en, es, fr, it, nl, pl, pt, tr
├── hooks/
│   ├── use-odoo-dashboard.ts                  Decoupled state, queries, mutations, and handlers for all 5 /app/odoo/* routes
│   └── use-order-odoo-status.ts               Decoupled state and sync mutation hook for the Order Details widget
├── components/                                18 modular UI files (all < 170 lines each)
│   ├── index.ts                               Barrel re-exporting all Admin UI components
│   ├── odoo-header.tsx                        Header bar with connection StatusBadge, protocol/circuit badges, locale selector & Sync All
│   ├── overview-cards.tsx                     StatCard (KPI cards with Skeleton loading) & NavigationCard (sub-route cards)
│   ├── overview-tab.tsx                       Manual bidirectional sync controls (products, stock, customers, reconciliation)
│   ├── connection-tab.tsx                     Connection credentials KeyboundForm, protocol selector & private-network Switch
│   ├── connection-security-section.tsx        Side panel summarizing SSRF guard, secret redaction & circuit breaker settings
│   ├── settings-tab.tsx                       Composite view rendering all 4 entity sync settings sections
│   ├── product-settings-section.tsx           Product catalog sync toggles (enableProductSync, autoPublish, syncImages)
│   ├── inventory-settings-section.tsx         Multi-warehouse stock sync toggles (enableStock, forecasted qty, warehouse count)
│   ├── order-settings-section.tsx             Order & accounting toggles (orderSync, exportInvoice, createPayment)
│   ├── reconciliation-settings-section.tsx    Drift reconciliation toggles (enableScheduledReconciliation, active strategy)
│   ├── logs-tab.tsx                           Composite observability view combining failures, conflicts & recent sync runs
│   ├── failures-section.tsx                   Dead-letter sync failures Table with Mark Resolved action
│   ├── conflicts-section.tsx                  Inventory drift conflicts Table with Odoo Wins / Medusa Wins buttons
│   ├── sync-logs-table.tsx                    Recent sync runs Table (entity, direction, status, counts, duration)
│   ├── barcode-tab.tsx                        Interactive POS & warehouse barcode lookup form + resolution telemetry
│   ├── pos-transactions-section.tsx           Offline POS transactions Table (external ID, total, Medusa/Odoo order IDs, status)
│   └── order-odoo-summary.tsx                 Presentational card for the Order Details Odoo ERP widget
├── routes/
│   └── odoo/                                  Page routes registered in the Medusa Admin shell
│       ├── page.tsx                           /app/odoo — Overview & Manual Sync dashboard
│       ├── connection/
│       │   └── page.tsx                       /app/odoo/connection — Connection & Protocol settings
│       ├── settings/
│       │   └── page.tsx                       /app/odoo/settings — Entity Sync Rules
│       ├── logs/
│       │   └── page.tsx                       /app/odoo/logs — Logs, Dead-Letter Failures & Drift Conflicts
│       └── barcode/
│           └── page.tsx                       /app/odoo/barcode — POS Barcode Lookup & Offline POS Queue
└── widgets/
    ├── order-odoo-widget.tsx                  order.details.after — Odoo sale.order & account.move status + manual sync
    └── product-odoo-widget.tsx                product.details.after — Odoo product.template link badge + catalog sync
```

---

## Route Registration & Layout Conventions

Every `page.tsx` under `routes/odoo/` exports a `config` created with `defineRouteConfig` (setting `translationNs: "odoo"`) and a `handle` object providing a `<Breadcrumb />` component. Pages use `@medusajs/dashboard` layout primitives (`LayoutComposer`, `CORE_LAYOUT_IDS.SINGLE_COLUMN`, and `CORE_LAYOUT_IDS.TWO_COLUMN`).

| Route Path | File | Layout Mode | `widgetsZonePrefix` | Rendered Sections |
| :--- | :--- | :--- | :--- | :--- |
| `/app/odoo` | `routes/odoo/page.tsx` | `SINGLE_COLUMN` | `odoo.overview` | `OdooHeader`, 4× `StatCard`, 4× `NavigationCard`, `OverviewTab` |
| `/app/odoo/connection` | `routes/odoo/connection/page.tsx` | `TWO_COLUMN` | `odoo.connection` | **Main**: `ConnectionTab`<br>**Side**: `ConnectionSecuritySideSection` |
| `/app/odoo/settings` | `routes/odoo/settings/page.tsx` | `TWO_COLUMN` | `odoo.settings` | **Main**: `ProductSyncSettingsSection`, `OrderSyncSettingsSection`<br>**Side**: `InventorySyncSettingsSection`, `ReconciliationSettingsSection` |
| `/app/odoo/logs` | `routes/odoo/logs/page.tsx` | `SINGLE_COLUMN` | `odoo.logs` | `SyncFailuresSection`, `DriftConflictsSection`, `RecentSyncRunsSection` |
| `/app/odoo/barcode` | `routes/odoo/barcode/page.tsx` | `TWO_COLUMN` | `odoo.barcode` | **Main**: `BarcodeLookupSection`<br>**Side**: `PosTransactionsSection` |

---

## Widgets

| Widget File | Injection Zone | Hook / Data Source | Purpose |
| :--- | :--- | :--- | :--- |
| `widgets/order-odoo-widget.tsx` | `order.details.after` | `useOrderOdooStatus` (`hooks/use-order-odoo-status.ts`) | Displays linked Odoo `sale.order` ID (`odoo_order_id`) and `account.move` invoice ID (`odoo_invoice_id`) via `OrderOdooSummary`, and triggers `POST /admin/odoo/sync-order/:id`. |
| `widgets/product-odoo-widget.tsx` | `product.details.after` | `useOdooMappings` & `useTriggerOdooSync` (`src/hooks/index.ts`) | Displays whether the Medusa product is linked to an Odoo `product.template` record in `mpo_erp_mapping` and provides a one-click catalog sync button. |

---

## Admin Hooks (`hooks/`)

| Hook | File | Responsibilities |
| :--- | :--- | :--- |
| `useOdooDashboard` | `hooks/use-odoo-dashboard.ts` | Centralizes queries (`status`, `config`, `options`, `product`/`inventory`/`orders`/`reconciliation` settings, `mappings`, `logs`, `failures`, `conflicts`, `posTransactions`), mutations (`saveConfig`, `verifyConnection`, `saveSectionSettings`, `triggerSync`, `resolveFailure`, `resolveConflict`, `barcodeLookup`), connection form state, and toast feedback across all 5 Admin routes. |
| `useOrderOdooStatus` | `hooks/use-order-odoo-status.ts` | Queries `mpo_erp_mapping` for `entity_type: "order"` and `medusa_id: orderId`, extracts `odooOrderId` and `odooInvoiceId` from order metadata or mapping metadata, and exposes `handleSyncOrder` with toast notifications. |

---

## Component Library (`components/`)

All 18 files in `components/` are strictly under 170 lines each and built on `@medusajs/ui` (`Container`, `Heading`, `Text`, `StatusBadge`, `Badge`, `Button`, `Table`, `Input`, `Select`, `Switch`, `Skeleton`, `Toaster`) and `@medusajs/dashboard` (`Form`, `KeyboundForm`, `SectionRow`).

| File | Exported Component(s) | Purpose |
| :--- | :--- | :--- |
| `index.ts` | Barrel exports | Re-exports all 17 presentational component modules. |
| `odoo-header.tsx` | `OdooHeader` | Renders title, subtitle, connection `StatusBadge`, protocol & circuit-breaker `Badge`s, 10-locale language switcher, `Refresh`, and `Sync All Entities` buttons. |
| `overview-cards.tsx` | `StatCard`, `NavigationCard` | KPI metric card with `Skeleton` loading state and clickable navigation card with icon and badge. |
| `overview-tab.tsx` | `OverviewTab` | Displays entity mapping/failure/conflict/POS counters and 6 manual sync trigger buttons (`Import Products`, `Export Products`, `Import Stock`, `Export Stock`, `Sync Customers`, `Run Drift Reconciliation`). |
| `connection-tab.tsx` | `ConnectionTab` | `KeyboundForm` for Odoo URL, database, username, protocol (`jsonrpc` / `json2`), password, API key, webhook HMAC secret, and private network toggle. |
| `connection-security-section.tsx` | `ConnectionSecuritySideSection` | Displays active SSRF protection status, credential redaction indicators (`hasPassword`, `hasApiKey`, `hasWebhookSecret`), and circuit breaker health. |
| `settings-tab.tsx` | `SettingsTab` | Two-column composite container grouping Product, Inventory, Order, and Reconciliation settings sections. |
| `product-settings-section.tsx` | `ProductSyncSettingsSection` | `Switch` controls for `enableProductSync`, `autoPublish`, and `syncImages`. |
| `inventory-settings-section.tsx` | `InventorySyncSettingsSection` | `Switch` controls for `enableStock` and `qtyType` (`forecasted` vs `on_hand`), plus discovered Odoo warehouse and Medusa location counts. |
| `order-settings-section.tsx` | `OrderSyncSettingsSection` | `Switch` controls for `orderSync`, `exportInvoice` (`account.move`), and `createPayment` (`account.payment.register`). |
| `reconciliation-settings-section.tsx` | `ReconciliationSettingsSection` | `Switch` control for `enableScheduledReconciliation` and active reconciliation strategy badge (`odoo_wins`, `medusa_wins`, `manual_conflict`). |
| `logs-tab.tsx` | `LogsTab` | Composite view stacking `SyncFailuresSection`, `DriftConflictsSection`, and `RecentSyncRunsSection`. |
| `failures-section.tsx` | `SyncFailuresSection` | `Table` of unresolved `mpo_sync_failure` records with entity type, direction, error message, and `Mark Resolved` action button. |
| `conflicts-section.tsx` | `DriftConflictsSection` | `Table` of open `mpo_conflict_resolution` records comparing Medusa vs. Odoo quantities with `Odoo Wins` and `Medusa Wins` resolution buttons. |
| `sync-logs-table.tsx` | `RecentSyncRunsSection` | `Table` of recent `mpo_sync_log` runs showing entity, direction, `StatusBadge`, created/updated/failed counts, and duration in milliseconds. |
| `barcode-tab.tsx` | `BarcodeLookupSection`, `BarcodeTab` | Interactive barcode/EAN-13/SKU lookup form with context cycling (`pos`, `warehouse`, `receiving`, `stocktake`) and resolution latency/source readout. |
| `pos-transactions-section.tsx` | `PosTransactionsSection` | `Table` of `mpo_offline_pos_transaction` items showing external POS ID, formatted currency total, linked Medusa/Odoo order IDs, and replay status. |
| `order-odoo-summary.tsx` | `OrderOdooSummary` | Compact container rendered inside `order-odoo-widget.tsx` displaying Odoo Sales Order badge, Invoice badge, and sync button. |

---

## i18n

Translations are configured in [`i18n/`](./i18n/README.md) using `react-i18next` across 10 supported locales (`ar`, `de`, `en`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `tr`).
