import {
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import { OdooClient, type FetchLike } from "./client/odoo-client"
import { OdooModels } from "./models"
import * as barcode from "./pos/barcode"
import type { BarcodeCacheEntry } from "./pos/barcode"
import * as offlinePos from "./pos/offline"
import { buildSectionDefaults } from "./settings-defaults"
import * as customers from "./sync/customers"
import * as inventory from "./sync/inventory"
import * as orders from "./sync/orders"
import * as products from "./sync/products"
import * as reconciliation from "./sync/reconciliation"
import type {
  OdooConnectionConfig,
  OdooConnectionVerificationResult,
  OdooEntityType,
  OdooPluginOptions,
  OdooRedactedConnectionConfig,
  OdooSectionName,
  OdooStatusOverview,
  OdooSyncDirection,
} from "./types"
import { odooMetrics } from "./utils/metrics"
import { computeExternalChecksum, redactOdooConfig } from "./utils/security"
import * as webhooks from "./webhooks"

export class OdooModuleService extends MedusaService(OdooModels) {
  readonly options_: OdooPluginOptions
  readonly container_: Record<string, unknown>
  private cachedClient_: OdooClient | null = null
  private cachedClientKey_ = ""
  private customFetch_: FetchLike | undefined
  readonly barcodeCache_ = new Map<string, BarcodeCacheEntry>()

  constructor(
    container: Record<string, unknown> = {},
    options: OdooPluginOptions = {}
  ) {
    super(...arguments)
    this.container_ = container
    this.options_ = options ?? {}
  }

  async setCustomFetch(fetchImpl?: FetchLike): Promise<void> {
    this.customFetch_ = fetchImpl
    this.cachedClient_ = null
    this.cachedClientKey_ = ""
  }

  // ─── Key-Value Setting Store ───────────────────────────────────────────────

  async getValue<T = unknown>(key: string): Promise<T | null> {
    const rows = await this.listOdooSettings({ key }, { take: 1 })
    return (rows?.[0]?.value as T) ?? null
  }

  async setValue<T = unknown>(key: string, value: T): Promise<T> {
    const existing = await this.listOdooSettings({ key }, { take: 1 })
    const serialized = (value ?? null) as Record<string, unknown> | null
    if (existing?.[0]) {
      await this.updateOdooSettings({
        id: existing[0].id,
        value: serialized,
      })
    } else {
      await this.createOdooSettings({
        key,
        value: serialized,
      })
    }
    return value
  }

  // ─── Connection & Section Configuration ────────────────────────────────────

  async getConnectionConfig(): Promise<OdooConnectionConfig> {
    const stored =
      (await this.getValue<Partial<OdooConnectionConfig>>("connection")) ?? {}

    return {
      url: stored.url ?? this.options_.url ?? process.env.ODOO_URL ?? "",
      db: stored.db ?? this.options_.db ?? process.env.ODOO_DB ?? "",
      username:
        stored.username ??
        this.options_.username ??
        process.env.ODOO_USERNAME ??
        "",
      password:
        stored.password ??
        this.options_.password ??
        process.env.ODOO_PASSWORD ??
        undefined,
      apiKey:
        stored.apiKey ??
        this.options_.apiKey ??
        process.env.ODOO_API_KEY ??
        undefined,
      protocol:
        stored.protocol ??
        this.options_.protocol ??
        ((process.env.ODOO_PROTOCOL as "jsonrpc" | "json2") || "jsonrpc"),
      companyId: stored.companyId ?? this.options_.companyId ?? null,
      timeoutMs: stored.timeoutMs ?? this.options_.timeoutMs ?? 30_000,
      maxRetries: stored.maxRetries ?? this.options_.maxRetries ?? 3,
      rateLimitPerSec:
        stored.rateLimitPerSec ?? this.options_.rateLimitPerSec ?? 20,
      circuitThreshold:
        stored.circuitThreshold ?? this.options_.circuitThreshold ?? 5,
      circuitResetMs:
        stored.circuitResetMs ?? this.options_.circuitResetMs ?? 60_000,
      allowPrivateNetwork:
        stored.allowPrivateNetwork ??
        this.options_.allowPrivateNetwork ??
        process.env.ODOO_ALLOW_PRIVATE_NETWORK === "true",
      webhookSecret:
        stored.webhookSecret ??
        this.options_.webhookSecret ??
        process.env.ODOO_WEBHOOK_SECRET ??
        undefined,
    }
  }

  async getRedactedConnectionConfig(): Promise<OdooRedactedConnectionConfig> {
    const config = await this.getConnectionConfig()
    return redactOdooConfig(config)
  }

  async saveConnectionConfig(
    patch: Partial<OdooConnectionConfig>
  ): Promise<OdooRedactedConnectionConfig> {
    const existing = await this.getConnectionConfig()
    const merged: OdooConnectionConfig = {
      ...existing,
      ...patch,
      password:
        patch.password !== undefined && patch.password !== ""
          ? patch.password
          : existing.password,
      apiKey:
        patch.apiKey !== undefined && patch.apiKey !== ""
          ? patch.apiKey
          : existing.apiKey,
      webhookSecret:
        patch.webhookSecret !== undefined && patch.webhookSecret !== ""
          ? patch.webhookSecret
          : existing.webhookSecret,
    }
    await this.setValue("connection", merged)
    this.cachedClient_ = null
    this.cachedClientKey_ = ""
    return redactOdooConfig(merged)
  }

  async getSectionSettings<T = Record<string, unknown>>(
    section: OdooSectionName
  ): Promise<T> {
    const stored = await this.getValue<T>(`section:${section}`)
    const defaults = buildSectionDefaults(this.options_)

    return {
      ...(defaults[section] as Record<string, unknown>),
      ...((stored as Record<string, unknown>) ?? {}),
    } as T
  }

  async saveSectionSettings<T extends Record<string, unknown>>(
    section: OdooSectionName,
    settings: Partial<T>
  ): Promise<T> {
    const current = await this.getSectionSettings<T>(section)
    const updated = { ...current, ...settings }
    await this.setValue(`section:${section}`, updated)
    return updated
  }

  async getOdooClient(
    overrideConfig?: Partial<OdooConnectionConfig>
  ): Promise<OdooClient> {
    const base = await this.getConnectionConfig()
    const merged: OdooConnectionConfig = {
      ...base,
      ...(overrideConfig ?? {}),
    }

    if (!merged.url || !merged.db || !merged.username) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Odoo connection is not configured (url, db, and username are required)."
      )
    }

    const key = computeExternalChecksum(merged)
    if (!overrideConfig && this.cachedClient_ && this.cachedClientKey_ === key) {
      return this.cachedClient_
    }

    const client = new OdooClient(merged, { fetchImpl: this.customFetch_ })
    if (!overrideConfig) {
      this.cachedClient_ = client
      this.cachedClientKey_ = key
    }
    return client
  }

  async verifyConnection(
    overrideConfig?: Partial<OdooConnectionConfig>
  ): Promise<OdooConnectionVerificationResult> {
    const base = await this.getConnectionConfig()
    const merged: OdooConnectionConfig = {
      ...base,
      ...(overrideConfig ?? {}),
    }

    try {
      const client = await this.getOdooClient(merged)
      const uid = await client.authenticate()
      const [serverVersion, companies, warehouses, journals, categories] =
        await Promise.all([
          client.getServerVersion(),
          client.getCompanies().catch(() => []),
          client.getWarehouses().catch(() => []),
          client.getPaymentJournals().catch(() => []),
          client.getProductCategories().catch(() => []),
        ])

      return {
        ok: true,
        uid,
        serverVersion,
        protocol: client.protocol,
        companies,
        warehouses,
        journals,
        categories,
        message: `Connected to Odoo (${serverVersion || "v16+"}) as UID ${uid} via ${client.protocol}.`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        uid: null,
        serverVersion: null,
        protocol: merged.protocol ?? "jsonrpc",
        message: msg,
      }
    }
  }

  async getStatusOverview(): Promise<OdooStatusOverview> {
    const config = await this.getConnectionConfig()
    const [mappings, failures, conflicts, pendingPos, recentLogs] =
      await Promise.all([
        this.listErpMappings({}, { take: 1000 }).catch(() => []),
        this.listErpSyncFailures({ resolved: false }, { take: 1000 }).catch(
          () => []
        ),
        this.listErpConflictResolutions(
          { status: "open" },
          { take: 1000 }
        ).catch(() => []),
        this.listOfflinePosTransactions(
          { status: "pending" },
          { take: 1000 }
        ).catch(() => []),
        this.listErpSyncLogs({}, { take: 50 }).catch(() => []),
      ])

    odooMetrics.setOpenCounts(failures.length, conflicts.length)

    if (!config.url || !config.db || !config.username) {
      return {
        status: "unconfigured",
        protocol: config.protocol ?? "jsonrpc",
        circuitState: "closed",
        serverVersion: null,
        totalMappings: mappings.length,
        openFailures: failures.length,
        openConflicts: conflicts.length,
        pendingPosTransactions: pendingPos.length,
        recentLogsCount: recentLogs.length,
        timestamp: new Date().toISOString(),
      }
    }

    try {
      const client = await this.getOdooClient()
      const healthy = await client.healthCheck()
      const serverVersion = healthy ? await client.getServerVersion() : null

      return {
        status: healthy ? "connected" : "disconnected",
        protocol: client.protocol,
        circuitState: client.getCircuitState(),
        serverVersion,
        totalMappings: mappings.length,
        openFailures: failures.length,
        openConflicts: conflicts.length,
        pendingPosTransactions: pendingPos.length,
        recentLogsCount: recentLogs.length,
        timestamp: new Date().toISOString(),
      }
    } catch {
      return {
        status: "disconnected",
        protocol: config.protocol ?? "jsonrpc",
        circuitState: this.cachedClient_?.getCircuitState() ?? "closed",
        serverVersion: null,
        totalMappings: mappings.length,
        openFailures: failures.length,
        openConflicts: conflicts.length,
        pendingPosTransactions: pendingPos.length,
        recentLogsCount: recentLogs.length,
        timestamp: new Date().toISOString(),
      }
    }
  }

  // ─── Mapping, Logging & Failure Helpers ────────────────────────────────────

  async upsertMapping(params: {
    entityType: OdooEntityType
    medusaId: string
    odooId: number
    direction?: OdooSyncDirection
    odooModel?: string
    externalChecksum?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    const existing = await this.listErpMappings(
      {
        entity_type: params.entityType,
        medusa_id: params.medusaId,
      },
      { take: 1 }
    )

    if (existing?.[0]) {
      const currentVersion =
        typeof (existing[0] as Record<string, unknown>).sync_version ===
        "number"
          ? Number((existing[0] as Record<string, unknown>).sync_version)
          : 1
      return this.updateErpMappings({
        id: existing[0].id,
        odoo_id: params.odooId,
        odoo_model: params.odooModel ?? existing[0].odoo_model ?? "",
        sync_direction:
          params.direction ?? existing[0].sync_direction ?? "bidirectional",
        sync_version: currentVersion + 1,
        external_checksum:
          params.externalChecksum ?? existing[0].external_checksum ?? null,
        status: "active",
        last_synced_at: new Date(),
        metadata: params.metadata ?? existing[0].metadata ?? null,
      })
    }

    return this.createErpMappings({
      entity_type: params.entityType,
      medusa_id: params.medusaId,
      odoo_id: params.odooId,
      odoo_model: params.odooModel ?? "",
      sync_direction: params.direction ?? "bidirectional",
      sync_version: 1,
      external_checksum: params.externalChecksum ?? null,
      status: "active",
      last_synced_at: new Date(),
      metadata: params.metadata ?? null,
    })
  }

  async getOdooId(
    entityType: OdooEntityType,
    medusaId: string
  ): Promise<number | null> {
    const rows = await this.listErpMappings(
      { entity_type: entityType, medusa_id: medusaId },
      { take: 1 }
    )
    return rows?.[0]?.odoo_id ?? null
  }

  async getMedusaId(
    entityType: OdooEntityType,
    odooId: number
  ): Promise<string | null> {
    const rows = await this.listErpMappings(
      { entity_type: entityType, odoo_id: odooId },
      { take: 1 }
    )
    return rows?.[0]?.medusa_id ?? null
  }

  async logSync(params: {
    entityType: OdooEntityType | "all"
    direction: OdooSyncDirection
    trigger?: string
    status: "running" | "success" | "failed" | "skipped"
    created?: number
    updated?: number
    skipped?: number
    failed?: number
    durationMs?: number
    message?: string
    errorDetails?: Record<string, unknown> | null
  }) {
    const now = new Date()
    const logEntry = await this.createErpSyncLogs({
      entity_type: params.entityType,
      direction: params.direction,
      trigger: params.trigger ?? "manual",
      status: params.status,
      created_count: params.created ?? 0,
      updated_count: params.updated ?? 0,
      skipped_count: params.skipped ?? 0,
      failed_count: params.failed ?? 0,
      duration_ms: params.durationMs ?? 0,
      message: params.message ?? null,
      error_details: params.errorDetails ?? null,
      started_at: now,
      completed_at: params.status !== "running" ? now : null,
    })

    if (params.status !== "running") {
      odooMetrics.recordSyncRun({
        entity: params.entityType,
        direction: params.direction,
        status: params.status,
        created: params.created,
        updated: params.updated,
        skipped: params.skipped,
        failed: params.failed,
        durationMs: params.durationMs ?? 0,
      })
    }

    return logEntry
  }

  async recordFailure(params: {
    entityType: OdooEntityType
    medusaId?: string | null
    odooId?: number | null
    direction?: OdooSyncDirection
    trigger?: string
    payload?: Record<string, unknown> | null
    errorMessage: string
  }) {
    return this.createErpSyncFailures({
      entity_type: params.entityType,
      medusa_id: params.medusaId ?? null,
      odoo_id: params.odooId ?? null,
      direction: params.direction ?? "medusa_to_odoo",
      trigger: params.trigger ?? "event",
      payload: params.payload ?? null,
      error_message: params.errorMessage,
      attempt_count: 1,
      resolved: false,
    })
  }

  async resolveFailure(id: string, resolvedBy = "manual") {
    return this.updateErpSyncFailures({
      id,
      resolved: true,
      resolved_at: new Date(),
      resolved_by: resolvedBy,
    })
  }

  // ─── Domain operations (implemented in ./sync, ./pos and ./webhooks) ───────

  resolveConflict = reconciliation.resolveConflict
  reconcileInventory = reconciliation.reconcileInventory

  importProductsFromOdoo = products.importProductsFromOdoo
  exportProductsToOdoo = products.exportProductsToOdoo
  syncProducts = products.syncProducts
  archiveProductInOdoo = products.archiveProductInOdoo

  importInventoryFromOdoo = inventory.importInventoryFromOdoo
  exportInventoryToOdoo = inventory.exportInventoryToOdoo
  syncInventory = inventory.syncInventory

  syncOrderToOdoo = orders.syncOrderToOdoo
  cancelOrderInOdoo = orders.cancelOrderInOdoo

  syncCustomers = customers.syncCustomers

  resolveBarcode = barcode.resolveBarcode
  invalidateBarcodeCache = barcode.invalidateBarcodeCache
  warmBarcodeCache = barcode.warmBarcodeCache

  enqueueOfflinePosTransaction = offlinePos.enqueueOfflinePosTransaction
  replayOfflinePosTransaction = offlinePos.replayOfflinePosTransaction

  processWebhookEvent = webhooks.processWebhookEvent

  async getPrometheusMetrics(): Promise<string> {
    return odooMetrics.renderPrometheus()
  }

  async getMetricsSummary(): Promise<Record<string, unknown>> {
    return odooMetrics.toJSON()
  }
}

export default OdooModuleService
