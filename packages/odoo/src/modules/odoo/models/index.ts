import { model } from "@medusajs/framework/utils"

export const OdooSetting = model
  .define("mpo_setting", {
    id: model.id().primaryKey(),
    key: model.text().searchable(),
    value: model.json().nullable(),
  })
  .indexes([
    {
      on: ["key"],
      unique: true,
      name: "IDX_mpo_setting_key",
    },
  ])

export const ErpMapping = model
  .define("mpo_erp_mapping", {
    id: model.id().primaryKey(),
    entity_type: model.text().searchable(),
    medusa_id: model.text().searchable(),
    odoo_id: model.number(),
    odoo_model: model.text().default(""),
    sync_direction: model.text().default("bidirectional"),
    sync_version: model.number().default(1),
    external_checksum: model.text().nullable(),
    status: model.text().default("active"),
    last_synced_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["entity_type", "medusa_id"],
      name: "IDX_mpo_erp_mapping_entity_medusa",
    },
    {
      on: ["entity_type", "odoo_id"],
      name: "IDX_mpo_erp_mapping_entity_odoo",
    },
  ])

export const ErpSyncLog = model
  .define("mpo_sync_log", {
    id: model.id().primaryKey(),
    entity_type: model.text().searchable(),
    direction: model.text().default("odoo_to_medusa"),
    trigger: model.text().default("manual"),
    status: model.text().default("running"),
    created_count: model.number().default(0),
    updated_count: model.number().default(0),
    skipped_count: model.number().default(0),
    failed_count: model.number().default(0),
    duration_ms: model.number().default(0),
    message: model.text().nullable(),
    error_details: model.json().nullable(),
    started_at: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["entity_type"],
      name: "IDX_mpo_sync_log_entity",
    },
    {
      on: ["status"],
      name: "IDX_mpo_sync_log_status",
    },
  ])

export const ErpSyncFailure = model
  .define("mpo_sync_failure", {
    id: model.id().primaryKey(),
    entity_type: model.text().searchable(),
    medusa_id: model.text().nullable(),
    odoo_id: model.number().nullable(),
    direction: model.text().default("medusa_to_odoo"),
    trigger: model.text().default("event"),
    payload: model.json().nullable(),
    error_message: model.text(),
    attempt_count: model.number().default(1),
    resolved: model.boolean().default(false),
    resolved_at: model.dateTime().nullable(),
    resolved_by: model.text().nullable(),
  })
  .indexes([
    {
      on: ["resolved"],
      name: "IDX_mpo_sync_failure_resolved",
    },
    {
      on: ["entity_type"],
      name: "IDX_mpo_sync_failure_entity",
    },
  ])

export const ErpInventorySnapshot = model
  .define("mpo_inventory_snapshot", {
    id: model.id().primaryKey(),
    product_id: model.text().default(""),
    variant_id: model.text().searchable(),
    sku: model.text().nullable(),
    location_id: model.text().default(""),
    odoo_product_id: model.number().nullable(),
    odoo_location_id: model.number().nullable(),
    quantity_medusa: model.number().default(0),
    quantity_odoo: model.number().default(0),
    delta: model.number().default(0),
    reconciled: model.boolean().default(false),
    resolution_action: model.text().default("none"),
    snapshot_at: model.dateTime(),
  })
  .indexes([
    {
      on: ["variant_id"],
      name: "IDX_mpo_inv_snapshot_variant",
    },
  ])

export const ErpReconciliationLog = model
  .define("mpo_reconciliation_log", {
    id: model.id().primaryKey(),
    reconciliation_type: model.text().default("inventory"),
    strategy: model.text().default("odoo_wins"),
    drift_threshold: model.number().default(0),
    triggered_by: model.text().default("manual"),
    status: model.text().default("running"),
    checked_count: model.number().default(0),
    matched_count: model.number().default(0),
    drifted_count: model.number().default(0),
    fixed_count: model.number().default(0),
    conflict_count: model.number().default(0),
    error_count: model.number().default(0),
    details: model.json().nullable(),
    started_at: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["status"],
      name: "IDX_mpo_reconcil_log_status",
    },
  ])

export const ErpConflictResolution = model
  .define("mpo_conflict_resolution", {
    id: model.id().primaryKey(),
    entity_type: model.text().default("inventory"),
    medusa_id: model.text().searchable(),
    odoo_id: model.number().nullable(),
    field_name: model.text().default("stocked_quantity"),
    medusa_value: model.json().nullable(),
    odoo_value: model.json().nullable(),
    strategy: model.text().default("manual_conflict"),
    status: model.text().default("open"),
    resolved_value: model.json().nullable(),
    resolved_by: model.text().nullable(),
    resolved_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      on: ["status"],
      name: "IDX_mpo_conflict_status",
    },
  ])

export const BarcodeScanLog = model
  .define("mpo_barcode_scan_log", {
    id: model.id().primaryKey(),
    barcode: model.text().searchable(),
    context: model.text().default("pos"),
    device_id: model.text().nullable(),
    session_id: model.text().nullable(),
    operator_id: model.text().nullable(),
    variant_id: model.text().nullable(),
    odoo_product_id: model.number().nullable(),
    source: model.text().default("none"),
    resolution_status: model.text().default("resolved"),
    latency_ms: model.number().default(0),
    scan_timestamp: model.dateTime(),
  })
  .indexes([
    {
      on: ["barcode"],
      name: "IDX_mpo_barcode_scan_code",
    },
  ])

export const OfflinePosTransaction = model
  .define("mpo_offline_pos_transaction", {
    id: model.id().primaryKey(),
    external_transaction_id: model.text().searchable(),
    device_id: model.text().nullable(),
    session_id: model.text().nullable(),
    pos_location_id: model.text().nullable(),
    cart_id: model.text().nullable(),
    payment_method: model.text().nullable(),
    customer_id: model.text().nullable(),
    customer_email: model.text().nullable(),
    currency: model.text().default("USD"),
    total_cents: model.number().default(0),
    discount_cents: model.number().default(0),
    items: model.json(),
    status: model.text().default("pending"),
    medusa_order_id: model.text().nullable(),
    odoo_order_id: model.number().nullable(),
    replay_attempt_count: model.number().default(0),
    replay_error: model.text().nullable(),
    replayed_at: model.dateTime().nullable(),
    last_replay_at: model.dateTime().nullable(),
    next_retry_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["external_transaction_id"],
      unique: true,
      name: "IDX_mpo_offline_pos_ext_id",
    },
    {
      on: ["status"],
      name: "IDX_mpo_offline_pos_status",
    },
  ])

export const OdooWebhookEvent = model
  .define("mpo_webhook_event", {
    id: model.id().primaryKey(),
    event_id: model.text().searchable(),
    event_type: model.text(),
    odoo_model: model.text().nullable(),
    odoo_record_id: model.number().nullable(),
    status: model.text().default("processed"),
    payload: model.json().nullable(),
    error_message: model.text().nullable(),
    processed_at: model.dateTime(),
  })
  .indexes([
    {
      on: ["event_id"],
      unique: true,
      name: "IDX_mpo_webhook_event_id",
    },
  ])

export const OdooModels = {
  OdooSetting,
  ErpMapping,
  ErpSyncLog,
  ErpSyncFailure,
  ErpInventorySnapshot,
  ErpReconciliationLog,
  ErpConflictResolution,
  BarcodeScanLog,
  OfflinePosTransaction,
  OdooWebhookEvent,
}
