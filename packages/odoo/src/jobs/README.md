# Scheduled Jobs

Background cron jobs in `src/jobs/` that execute periodic bidirectional synchronization and automated inventory drift reconciliation between Medusa and Odoo ERP.

```sh
jobs/
├── README.md                    Scheduled jobs reference and configuration guide
├── odoo-scheduled-sync.ts       Periodic products, multi-warehouse inventory & customer sync job
└── odoo-reconciliation.ts       Periodic inventory drift detection & reconciliation job
```

---

## Job Reference

| File | Job Name (`config.name`) | Cron Schedule (`config.schedule`) | Pre-Flight Guards | Executed Operations |
| :--- | :--- | :--- | :--- | :--- |
| `odoo-scheduled-sync.ts` | `odoo-scheduled-sync-job` | `*/15 * * * *` *(or `0 */6 * * *` in low-frequency setups)* | 1. Checks `config.url && config.db && config.username` are configured.<br>2. Each service method checks its own section setting (`product.enableProductSync`, `inventory.enableStock`, `customers.enableCustomerSync`). | Sequentially executes:<br>1. `odooService.syncProducts(container, undefined, "scheduled")`<br>2. `odooService.syncInventory(container, undefined, "scheduled")`<br>3. `odooService.syncCustomers({ trigger: "scheduled" })` |
| `odoo-reconciliation.ts` | `odoo-inventory-reconciliation-job` | `0 */6 * * *` *(every 6 hours, or `0 2 * * *` nightly)* | 1. Checks `config.url && config.db && config.username` are configured.<br>2. Checks `reconciliation.enableScheduledReconciliation !== false`. | Executes `odooService.reconcileInventory({ triggeredBy: "scheduled" })` using the configured strategy (`odoo_wins`, `medusa_wins`, or `manual_conflict`) and `driftThreshold`. |

---

## How Scheduled Jobs Check Section Settings Before Running

1. **Connection Readiness Check**:
   Both jobs first resolve `OdooModuleService` (`container.resolve(ODOO_MODULE)`) and call `await odooService.getConnectionConfig()`. If `url`, `db`, or `username` is empty (i.e. the plugin is in `"unconfigured"` state), the job exits cleanly without logging spurious errors.
2. **Per-Section Enablement Toggles**:
   - In `odoo-scheduled-sync.ts`:
     - `syncProducts` reads `getSectionSettings<OdooProductSyncSettings>("product")` and skips execution if `enableProductSync === false`.
     - `syncInventory` reads `getSectionSettings<OdooInventorySyncSettings>("inventory")` and skips execution if `enableStock === false`.
     - `syncCustomers` reads `getSectionSettings<OdooCustomerSyncSettings>("customers")` and skips execution if `enableCustomerSync === false`.
   - In `odoo-reconciliation.ts`:
     - Explicitly reads `getSectionSettings<OdooReconciliationSettings>("reconciliation")` and exits early if `settings.enableScheduledReconciliation === false`.
     - Operators can toggle `Enable Scheduled Drift Reconciliation` at runtime in `/app/odoo/settings` (`ReconciliationSettingsSection`) without restarting the Medusa server.
3. **Observability & Audit Logging**:
   - Every scheduled sync run creates an `ErpSyncLog` (`mpo_sync_log`) entry with `trigger: "scheduled"`.
   - Every scheduled reconciliation run creates an `ErpReconciliationLog` (`mpo_reconciliation_log`) entry with `triggered_by: "scheduled"` and writes point-in-time `ErpInventorySnapshot` (`mpo_inventory_snapshot`) records.
