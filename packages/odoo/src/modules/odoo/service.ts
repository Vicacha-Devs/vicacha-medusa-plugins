import {
  ContainerRegistrationKeys,
  MedusaError,
  MedusaService,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import { OdooClient, type FetchLike } from "./client/odoo-client"
import { OdooModels } from "./models"
import type {
  OdooBarcodeContext,
  OdooBarcodeResolutionResult,
  OdooConnectionConfig,
  OdooConnectionVerificationResult,
  OdooCustomerSyncSettings,
  OdooEntityType,
  OdooInventorySyncSettings,
  OdooOrderSyncResult,
  OdooOrderSyncSettings,
  OdooPluginOptions,
  OdooPosSettings,
  OdooProductSyncSettings,
  OdooReconciliationDetail,
  OdooReconciliationResult,
  OdooReconciliationSettings,
  OdooRedactedConnectionConfig,
  OdooSectionName,
  OdooStatusOverview,
  OdooSyncDirection,
  OdooSyncResult,
  OdooWebhookPayload,
  OdooWebhookProcessResult,
  OdooWebhookSettings,
  OfflinePosEnqueueInput,
  OfflinePosReplayResult,
} from "./types"
import { odooMetrics } from "./utils/metrics"
import {
  computeExternalChecksum,
  redactOdooConfig,
  slugifyHandle,
  verifyOdooWebhookSignature,
} from "./utils/security"

interface BarcodeCacheEntry {
  result: Omit<OdooBarcodeResolutionResult, "source" | "latencyMs" | "resolvedAt">
  expiresAt: number
}

const PAID_STATUSES = new Set([
  "captured",
  "partially_captured",
  "paid",
  "partially_paid",
])

const FULFILLED_STATUSES = new Set([
  "fulfilled",
  "partially_fulfilled",
  "delivered",
  "partially_delivered",
])

export class OdooModuleService extends MedusaService(OdooModels) {
  protected readonly options_: OdooPluginOptions
  protected readonly container_: Record<string, unknown>
  private cachedClient_: OdooClient | null = null
  private cachedClientKey_ = ""
  private customFetch_: FetchLike | undefined
  private barcodeCache_ = new Map<string, BarcodeCacheEntry>()

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

  protected resolveMedusaService<T = unknown>(
    serviceKey: string,
    scopeOverride?: unknown
  ): T | null {
    const scope = (scopeOverride ?? this.container_) as
      | { resolve?: (k: string) => unknown }
      | Record<string, unknown>
      | undefined
    if (!scope) return null
    try {
      if (typeof (scope as { resolve?: unknown }).resolve === "function") {
        return (scope as { resolve: (k: string) => T }).resolve(serviceKey)
      }
      if (serviceKey in (scope as Record<string, unknown>)) {
        return (scope as Record<string, T>)[serviceKey] ?? null
      }
    } catch {
      return null
    }
    return null
  }

  protected resolveQueryGraph(scopeOverride?: unknown): {
    graph: (args: {
      entity: string
      fields: string[]
      filters?: Record<string, unknown>
      pagination?: { take?: number; skip?: number }
    }) => Promise<{ data: Array<Record<string, unknown>> }>
  } | null {
    const query = this.resolveMedusaService<{
      graph?: (args: {
        entity: string
        fields: string[]
        filters?: Record<string, unknown>
        pagination?: { take?: number; skip?: number }
      }) => Promise<{ data: Array<Record<string, unknown>> }>
    }>(ContainerRegistrationKeys.QUERY, scopeOverride)
    return query && typeof query.graph === "function"
      ? (query as {
          graph: (args: {
            entity: string
            fields: string[]
            filters?: Record<string, unknown>
            pagination?: { take?: number; skip?: number }
          }) => Promise<{ data: Array<Record<string, unknown>> }>
        })
      : null
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
    const defaults: Record<OdooSectionName, unknown> = {
      product: {
        enableProductSync: true,
        direction: "odoo_to_medusa",
        creationMode: "create_update",
        skuMapping: "sku",
        createDraft: false,
        autoPublish: true,
        syncImages: true,
        updateFields: ["title", "description", "prices", "images"],
        odooCategoryIds: [],
        medusaCollectionIds: [],
        productLimit: null,
        ...(this.options_.productSettings ?? {}),
      } satisfies OdooProductSyncSettings,
      inventory: {
        enableStock: true,
        direction: "odoo_to_medusa",
        qtyType: "on_hand",
        doNotSyncZeroStock: false,
        locationMappings: [],
        ...(this.options_.inventorySettings ?? {}),
      } satisfies OdooInventorySyncSettings,
      orders: {
        orderSync: true,
        confirmOrderInOdoo: true,
        failOnUnmatchedSku: true,
        exportInvoice: false,
        invoiceMode: "paid",
        markInvoicePaid: false,
        createPayment: false,
        paymentJournalId: null,
        ...(this.options_.orderSettings ?? {}),
      } satisfies OdooOrderSyncSettings,
      customers: {
        enableCustomerSync: true,
        direction: "bidirectional",
        syncAddresses: true,
        syncCompanyVat: true,
        ...(this.options_.customerSettings ?? {}),
      } satisfies OdooCustomerSyncSettings,
      reconciliation: {
        enableScheduledReconciliation: true,
        strategy: "odoo_wins",
        driftThreshold: 0,
        defaultOdooLocationId: 8,
        ...(this.options_.reconciliationSettings ?? {}),
      } satisfies OdooReconciliationSettings,
      webhooks: {
        enableInboundWebhooks: true,
        autoProcessProductEvents: true,
        autoProcessStockEvents: true,
        autoProcessCustomerEvents: true,
        autoProcessOrderEvents: true,
        ...(this.options_.webhookSettings ?? {}),
      } satisfies OdooWebhookSettings,
      pos: {
        enableOfflinePosReplay: true,
        enableBarcodeCache: true,
        posCacheTtlSeconds: 3600,
        warehouseCacheTtlSeconds: 14400,
        ...(this.options_.posSettings ?? {}),
      } satisfies OdooPosSettings,
    }

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

  async resolveConflict(params: {
    id: string
    resolution: "odoo_wins" | "medusa_wins" | "custom"
    customValue?: unknown
    resolvedBy?: string
    scope?: { resolve: (key: string) => unknown }
    applyStock?: boolean
  }) {
    const existing = await this.listErpConflictResolutions(
      { id: params.id },
      { take: 1 }
    )
    const row = existing?.[0]
    if (!row) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Conflict ${params.id} not found`
      )
    }

    const resolvedValue =
      params.resolution === "odoo_wins"
        ? row.odoo_value
        : params.resolution === "medusa_wins"
          ? row.medusa_value
          : typeof params.customValue === "number"
            ? { qty: params.customValue }
            : (params.customValue as Record<string, unknown>)

    const winningQty =
      typeof resolvedValue === "number"
        ? resolvedValue
        : resolvedValue &&
            typeof resolvedValue === "object" &&
            "qty" in resolvedValue &&
            typeof (resolvedValue as { qty?: unknown }).qty === "number"
          ? Number((resolvedValue as { qty: number }).qty)
          : null

    if (params.applyStock !== false && winningQty !== null) {
      if (
        (params.resolution === "medusa_wins" ||
          params.resolution === "custom") &&
        row.odoo_id
      ) {
        try {
          const client = await this.getOdooClient()
          const recSettings =
            await this.getSectionSettings<OdooReconciliationSettings>(
              "reconciliation"
            )
          await client.updateStockQuantity(
            Number(row.odoo_id),
            recSettings.defaultOdooLocationId ?? 8,
            winningQty
          )
        } catch {
          // Non-blocking when Odoo is unreachable
        }
      }

      if (
        (params.resolution === "odoo_wins" ||
          params.resolution === "custom") &&
        row.medusa_id
      ) {
        try {
          const activeScope =
            params.scope ??
            (this.container_ as { resolve?: (k: string) => unknown })
          const inventoryModule =
            typeof activeScope?.resolve === "function"
              ? (activeScope.resolve(Modules.INVENTORY) as
                  | {
                      listInventoryLevels?: (
                        filter: Record<string, unknown>
                      ) => Promise<Array<{ id: string }>>
                      updateInventoryLevels?: (
                        data: Array<Record<string, unknown>>
                      ) => Promise<unknown>
                    }
                  | undefined)
              : undefined

          if (
            inventoryModule?.listInventoryLevels &&
            inventoryModule.updateInventoryLevels
          ) {
            const levels = await inventoryModule.listInventoryLevels({
              inventory_item_id: row.medusa_id,
            })
            if (levels?.[0]?.id) {
              await inventoryModule.updateInventoryLevels([
                { id: levels[0].id, stocked_quantity: winningQty },
              ])
            }
          }
        } catch {
          // Non-blocking when Medusa Inventory module is unavailable
        }
      }
    }

    return this.updateErpConflictResolutions({
      id: params.id,
      strategy: params.resolution,
      status: "resolved",
      resolved_value: resolvedValue ?? null,
      resolved_by: params.resolvedBy ?? "manual",
      resolved_at: new Date(),
    })
  }

  // ─── Two-Way Product Sync ──────────────────────────────────────────────────

  async importProductsFromOdoo(
    scope?: { resolve: (key: string) => unknown },
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooProductSyncSettings>("product")

    if (settings.enableProductSync === false) {
      const durationMs = Date.now() - started
      await this.logSync({
        entityType: "product",
        direction: "odoo_to_medusa",
        trigger,
        status: "skipped",
        durationMs,
        message: "Product sync is disabled.",
      })
      return {
        ok: true,
        entity: "product",
        direction: "odoo_to_medusa",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        durationMs,
        message: "Product sync is disabled.",
      }
    }

    try {
      const client = await this.getOdooClient()
      let odooProducts = await client.fetchDetailedProducts({
        categoryIds: settings.odooCategoryIds,
        withImages: settings.syncImages,
      })

      if (
        settings.productLimit &&
        settings.productLimit > 0 &&
        odooProducts.length > settings.productLimit
      ) {
        odooProducts = odooProducts.slice(0, settings.productLimit)
      }

      if (!odooProducts.length) {
        const durationMs = Date.now() - started
        const log = await this.logSync({
          entityType: "product",
          direction: "odoo_to_medusa",
          trigger,
          status: "success",
          durationMs,
          message: "No products to import from Odoo.",
        })
        return {
          ok: true,
          entity: "product",
          direction: "odoo_to_medusa",
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          durationMs,
          message: "No products to import from Odoo.",
          logId: log.id,
        }
      }

      const activeScope = scope ?? (this.container_ as { resolve?: (k: string) => unknown })
      const query =
        typeof activeScope?.resolve === "function"
          ? (activeScope.resolve(ContainerRegistrationKeys.QUERY) as
              | {
                  graph: (args: Record<string, unknown>) => Promise<{
                    data: Array<Record<string, unknown>>
                  }>
                }
              | undefined)
          : undefined

      const productModule =
        typeof activeScope?.resolve === "function"
          ? (activeScope.resolve(Modules.PRODUCT) as
              | {
                  createProducts?: (
                    data: Array<Record<string, unknown>>
                  ) => Promise<Array<{ id: string }>>
                  updateProducts?: (
                    data: Array<Record<string, unknown>>
                  ) => Promise<unknown>
                }
              | undefined)
          : undefined

      const existingProducts: Array<Record<string, unknown>> = query
        ? (
            await query
              .graph({
                entity: "product",
                fields: [
                  "id",
                  "handle",
                  "metadata",
                  "images.id",
                  "variants.id",
                  "variants.sku",
                ],
                pagination: { take: 1000 },
              })
              .catch(() => ({ data: [] }))
          ).data
        : []

      const byOdooId = new Map<number, { id: string; handle?: string }>()
      const byHandle = new Map<string, { id: string }>()
      const bySku = new Map<string, { id: string }>()
      const usedHandles = new Set<string>()

      for (const ep of existingProducts) {
        const id = String(ep.id)
        const handle = typeof ep.handle === "string" ? ep.handle : undefined
        const info = { id, handle }
        if (handle) {
          usedHandles.add(handle)
          byHandle.set(handle, info)
        }
        const meta = ep.metadata as Record<string, unknown> | undefined
        if (meta?.odoo_id != null) {
          byOdooId.set(Number(meta.odoo_id), info)
        }
        const variants = Array.isArray(ep.variants)
          ? (ep.variants as Array<Record<string, unknown>>)
          : []
        for (const v of variants) {
          if (typeof v.sku === "string" && v.sku) {
            bySku.set(v.sku, info)
          }
        }
      }

      const uniqueHandle = (title: string): string => {
        const base = slugifyHandle(title)
        let candidate = base
        let index = 2
        while (usedHandles.has(candidate)) {
          candidate = `${base}-${index++}`
        }
        usedHandles.add(candidate)
        return candidate
      }

      const skuOf = (v: { sku?: string | null; barcode?: string | null }) =>
        (settings.skuMapping === "barcode" ? v.barcode : v.sku) ??
        v.sku ??
        v.barcode ??
        undefined

      const status = settings.createDraft
        ? ProductStatus.DRAFT
        : settings.autoPublish
          ? ProductStatus.PUBLISHED
          : ProductStatus.DRAFT

      const mode = settings.creationMode ?? "create_update"
      const updateFields = settings.updateFields ?? [
        "title",
        "description",
        "prices",
      ]

      let created = 0
      let updated = 0
      let skipped = 0
      let failed = 0
      const errors: string[] = []

      for (const p of odooProducts) {
        const mappedMedusaId = await this.getMedusaId("product", p.id)
        let found =
          (mappedMedusaId ? { id: mappedMedusaId } : undefined) ??
          byOdooId.get(p.id) ??
          byHandle.get(slugifyHandle(p.name))

        if (!found) {
          for (const v of p.variants) {
            const sku = skuOf(v)
            if (sku && bySku.has(sku)) {
              found = bySku.get(sku)
              break
            }
          }
        }

        try {
          if (found) {
            if (mode === "create") {
              skipped++
              continue
            }

            const updPayload: Record<string, unknown> = {
              id: found.id,
              status,
              metadata: { odoo_id: p.id },
            }
            if (updateFields.includes("title")) updPayload.title = p.name
            if (updateFields.includes("description")) {
              updPayload.description = p.description ?? undefined
            }

            if (productModule?.updateProducts) {
              await productModule.updateProducts([updPayload])
            }
            await this.upsertMapping({
              entityType: "product",
              medusaId: found.id,
              odooId: p.id,
              direction: "odoo_to_medusa",
              odooModel: "product.template",
              externalChecksum: computeExternalChecksum(p),
            })
            updated++
          } else {
            if (mode === "update") {
              skipped++
              continue
            }

            const handle = uniqueHandle(p.name)
            const createPayload: Record<string, unknown> = {
              title: p.name,
              handle,
              status,
              description: p.description ?? undefined,
              options: p.options,
              variants: p.variants.map((v) => ({
                title: v.options.Title || p.name,
                sku: skuOf(v),
                ...(v.barcode ? { barcode: v.barcode } : {}),
                options: v.options,
                prices: [{ amount: v.price, currency_code: "usd" }],
                manage_inventory: false,
              })),
              metadata: { odoo_id: p.id },
            }

            let newMedusaId = `prod_odoo_${p.id}`
            if (productModule?.createProducts) {
              const createdRows = await productModule.createProducts([
                createPayload,
              ])
              if (createdRows?.[0]?.id) {
                newMedusaId = createdRows[0].id
              }
            }

            await this.upsertMapping({
              entityType: "product",
              medusaId: newMedusaId,
              odooId: p.id,
              direction: "odoo_to_medusa",
              odooModel: "product.template",
              externalChecksum: computeExternalChecksum(p),
            })
            created++
          }
        } catch (err) {
          failed++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Product ${p.id}: ${msg}`)
          await this.recordFailure({
            entityType: "product",
            odooId: p.id,
            direction: "odoo_to_medusa",
            trigger,
            errorMessage: msg,
          })
        }
      }

      const durationMs = Date.now() - started
      const message = `Odoo → Medusa products: ${created} created, ${updated} updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}.`
      const log = await this.logSync({
        entityType: "product",
        direction: "odoo_to_medusa",
        trigger,
        status: failed > 0 ? "failed" : "success",
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        errorDetails: errors.length ? { errors } : null,
      })

      return {
        ok: failed === 0,
        entity: "product",
        direction: "odoo_to_medusa",
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        errors: errors.length ? errors : undefined,
        logId: log.id,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      await this.logSync({
        entityType: "product",
        direction: "odoo_to_medusa",
        trigger,
        status: "failed",
        failed: 1,
        durationMs,
        message: msg,
      })
      return {
        ok: false,
        entity: "product",
        direction: "odoo_to_medusa",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        durationMs,
        message: msg,
      }
    }
  }

  async exportProductsToOdoo(
    scope?: { resolve: (key: string) => unknown },
    productsInput?: Array<{
      id: string
      title: string
      description?: string | null
      sku?: string | null
      barcode?: string | null
      price?: number
      metadata?: Record<string, unknown> | null
    }>,
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooProductSyncSettings>("product")
    const mode = settings.creationMode ?? "create_update"

    try {
      const client = await this.getOdooClient()
      const activeScope = scope ?? (this.container_ as { resolve?: (k: string) => unknown })

      let products = productsInput ?? []
      if (!products.length && typeof activeScope?.resolve === "function") {
        const query = activeScope.resolve(ContainerRegistrationKeys.QUERY) as
          | {
              graph: (args: Record<string, unknown>) => Promise<{
                data: Array<Record<string, unknown>>
              }>
            }
          | undefined

        if (query) {
          const { data } = await query
            .graph({
              entity: "product",
              fields: [
                "id",
                "title",
                "description",
                "metadata",
                "variants.sku",
                "variants.barcode",
                "variants.prices.amount",
              ],
              pagination: { take: 1000 },
            })
            .catch(() => ({ data: [] }))

          products = data.map((p) => {
            const firstVariant = Array.isArray(p.variants)
              ? (p.variants[0] as Record<string, unknown> | undefined)
              : undefined
            const firstPrice = Array.isArray(firstVariant?.prices)
              ? (firstVariant.prices[0] as Record<string, unknown> | undefined)
              : undefined

            return {
              id: String(p.id),
              title: String(p.title ?? ""),
              description:
                typeof p.description === "string" ? p.description : null,
              sku:
                typeof firstVariant?.sku === "string" ? firstVariant.sku : null,
              barcode:
                typeof firstVariant?.barcode === "string"
                  ? firstVariant.barcode
                  : null,
              price: Number(firstPrice?.amount ?? 0),
              metadata: (p.metadata as Record<string, unknown>) ?? null,
            }
          })
        }
      }

      let created = 0
      let updated = 0
      let skipped = 0
      let failed = 0
      const errors: string[] = []

      for (const p of products) {
        // Avoid circular loop if product was imported directly from Odoo
        if (p.metadata?.odoo_id != null) {
          skipped++
          continue
        }

        const existingOdooId =
          (p.metadata?.odoo_export_id != null
            ? Number(p.metadata.odoo_export_id)
            : null) ?? (await this.getOdooId("product", p.id))

        if (existingOdooId && mode === "create") {
          skipped++
          continue
        }
        if (!existingOdooId && mode === "update") {
          skipped++
          continue
        }

        try {
          const vals: Record<string, unknown> = {
            name: p.title,
            description_sale: p.description ?? false,
            list_price: p.price ?? 0,
            ...(p.sku ? { default_code: p.sku } : {}),
            ...(p.barcode ? { barcode: p.barcode } : {}),
          }

          const res = await client.upsertProduct(p.id, vals, existingOdooId)
          await this.upsertMapping({
            entityType: "product",
            medusaId: p.id,
            odooId: res.id,
            direction: "medusa_to_odoo",
            odooModel: "product.template",
            externalChecksum: computeExternalChecksum(vals),
          })

          if (res.created) created++
          else updated++
        } catch (err) {
          failed++
          const msg = err instanceof Error ? err.message : String(err)
          errors.push(`Product ${p.id}: ${msg}`)
          await this.recordFailure({
            entityType: "product",
            medusaId: p.id,
            direction: "medusa_to_odoo",
            trigger,
            errorMessage: msg,
          })
        }
      }

      const durationMs = Date.now() - started
      const message = `Medusa → Odoo products: ${created} created, ${updated} updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}.`
      const log = await this.logSync({
        entityType: "product",
        direction: "medusa_to_odoo",
        trigger,
        status: failed > 0 ? "failed" : "success",
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        errorDetails: errors.length ? { errors } : null,
      })

      return {
        ok: failed === 0,
        entity: "product",
        direction: "medusa_to_odoo",
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        errors: errors.length ? errors : undefined,
        logId: log.id,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      await this.logSync({
        entityType: "product",
        direction: "medusa_to_odoo",
        trigger,
        status: "failed",
        failed: 1,
        durationMs,
        message: msg,
      })
      return {
        ok: false,
        entity: "product",
        direction: "medusa_to_odoo",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        durationMs,
        message: msg,
      }
    }
  }

  async syncProducts(
    scope?: { resolve: (key: string) => unknown },
    directionOverride?: OdooSyncDirection,
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const settings =
      await this.getSectionSettings<OdooProductSyncSettings>("product")
    const dir = directionOverride ?? settings.direction ?? "odoo_to_medusa"

    if (dir === "medusa_to_odoo") {
      return this.exportProductsToOdoo(scope, undefined, trigger)
    }
    if (dir === "bidirectional") {
      const imp = await this.importProductsFromOdoo(scope, trigger)
      const exp = await this.exportProductsToOdoo(scope, undefined, trigger)
      return {
        ok: imp.ok && exp.ok,
        entity: "product",
        direction: "bidirectional",
        created: imp.created + exp.created,
        updated: imp.updated + exp.updated,
        skipped: imp.skipped + exp.skipped,
        failed: imp.failed + exp.failed,
        durationMs: imp.durationMs + exp.durationMs,
        message: `${imp.message} | ${exp.message}`,
      }
    }
    return this.importProductsFromOdoo(scope, trigger)
  }

  async archiveProductInOdoo(
    medusaProductId: string,
    trigger = "event"
  ): Promise<{ ok: boolean; odooProductId: number | null; message: string }> {
    const started = Date.now()
    const odooId = await this.getOdooId("product", medusaProductId)
    if (!odooId) {
      return {
        ok: true,
        odooProductId: null,
        message: `No Odoo mapping found for deleted product ${medusaProductId}.`,
      }
    }

    try {
      const client = await this.getOdooClient()
      await client.write("product.template", [odooId], { active: false })
      await this.upsertMapping({
        entityType: "product",
        medusaId: medusaProductId,
        odooId,
        direction: "medusa_to_odoo",
        odooModel: "product.template",
        metadata: { archived: true },
      })
      await this.logSync({
        entityType: "product",
        direction: "medusa_to_odoo",
        trigger,
        status: "success",
        updated: 1,
        durationMs: Date.now() - started,
        message: `Archived Odoo product.template #${odooId} for deleted Medusa product ${medusaProductId}.`,
      })
      return {
        ok: true,
        odooProductId: odooId,
        message: `Archived Odoo product.template #${odooId}.`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.recordFailure({
        entityType: "product",
        medusaId: medusaProductId,
        odooId,
        direction: "medusa_to_odoo",
        trigger,
        errorMessage: msg,
      })
      return {
        ok: false,
        odooProductId: odooId,
        message: msg,
      }
    }
  }

  // ─── Two-Way Inventory Sync & Reconciliation ───────────────────────────────

  async importInventoryFromOdoo(
    scope?: { resolve: (key: string) => unknown },
    skusInput?: Array<{ inventoryItemId: string; sku: string }>,
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooInventorySyncSettings>("inventory")

    if (!settings.enableStock) {
      const durationMs = Date.now() - started
      return {
        ok: true,
        entity: "inventory",
        direction: "odoo_to_medusa",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        durationMs,
        message: "Stock sync is disabled.",
      }
    }

    const mappings = (settings.locationMappings ?? []).filter(
      (m) => m.medusaLocationId && m.odooWarehouseId
    )
    if (!mappings.length) {
      const durationMs = Date.now() - started
      return {
        ok: true,
        entity: "inventory",
        direction: "odoo_to_medusa",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        durationMs,
        message: "No warehouse location mappings configured.",
      }
    }

    try {
      const client = await this.getOdooClient()
      const activeScope = scope ?? (this.container_ as { resolve?: (k: string) => unknown })

      let items = skusInput ?? []
      const inventoryModule =
        typeof activeScope?.resolve === "function"
          ? (activeScope.resolve(Modules.INVENTORY) as
              | {
                  listInventoryLevels?: (
                    filter: Record<string, unknown>
                  ) => Promise<Array<{ id: string; stocked_quantity?: number }>>
                  updateInventoryLevels?: (
                    data: Array<Record<string, unknown>>
                  ) => Promise<unknown>
                  createInventoryLevels?: (
                    data: Array<Record<string, unknown>>
                  ) => Promise<unknown>
                }
              | undefined)
          : undefined

      if (!items.length && typeof activeScope?.resolve === "function") {
        const query = activeScope.resolve(ContainerRegistrationKeys.QUERY) as
          | {
              graph: (args: Record<string, unknown>) => Promise<{
                data: Array<{ id: string; sku?: string }>
              }>
            }
          | undefined

        if (query) {
          const { data } = await query
            .graph({
              entity: "inventory_item",
              fields: ["id", "sku"],
              pagination: { take: 5000 },
            })
            .catch(() => ({ data: [] }))
          items = data
            .filter((i) => Boolean(i.sku))
            .map((i) => ({ inventoryItemId: i.id, sku: String(i.sku) }))
        }
      }

      const itemBySku = new Map(items.map((i) => [i.sku, i.inventoryItemId]))
      const skus = [...itemBySku.keys()]

      if (!skus.length) {
        const durationMs = Date.now() - started
        return {
          ok: true,
          entity: "inventory",
          direction: "odoo_to_medusa",
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          durationMs,
          message: "No SKUs to sync.",
        }
      }

      let updated = 0
      let skipped = 0
      let failed = 0

      for (const map of mappings) {
        const levels = await client.readWarehouseStockBySkus({
          skus,
          warehouseId: map.odooWarehouseId,
          qtyType: settings.qtyType,
        })

        for (const lvl of levels) {
          const itemId = itemBySku.get(lvl.sku)
          if (!itemId) continue
          if (settings.doNotSyncZeroStock && lvl.qty === 0) {
            skipped++
            continue
          }

          try {
            if (inventoryModule?.listInventoryLevels) {
              const existing = await inventoryModule.listInventoryLevels({
                inventory_item_id: itemId,
                location_id: map.medusaLocationId,
              })
              if (existing?.[0] && inventoryModule.updateInventoryLevels) {
                await inventoryModule.updateInventoryLevels([
                  { id: existing[0].id, stocked_quantity: lvl.qty },
                ])
              } else if (inventoryModule.createInventoryLevels) {
                await inventoryModule.createInventoryLevels([
                  {
                    inventory_item_id: itemId,
                    location_id: map.medusaLocationId,
                    stocked_quantity: lvl.qty,
                  },
                ])
              }
            }
            updated++
          } catch {
            failed++
          }
        }
      }

      const durationMs = Date.now() - started
      const message = `Odoo → Medusa inventory: ${updated} levels updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}.`
      const log = await this.logSync({
        entityType: "inventory",
        direction: "odoo_to_medusa",
        trigger,
        status: failed > 0 ? "failed" : "success",
        updated,
        skipped,
        failed,
        durationMs,
        message,
      })

      return {
        ok: failed === 0,
        entity: "inventory",
        direction: "odoo_to_medusa",
        created: 0,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        logId: log.id,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      await this.logSync({
        entityType: "inventory",
        direction: "odoo_to_medusa",
        trigger,
        status: "failed",
        failed: 1,
        durationMs,
        message: msg,
      })
      return {
        ok: false,
        entity: "inventory",
        direction: "odoo_to_medusa",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        durationMs,
        message: msg,
      }
    }
  }

  async exportInventoryToOdoo(
    scope?: { resolve: (key: string) => unknown },
    levelsInput?: Array<{ locationId: string; sku: string; qty: number }>,
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooInventorySyncSettings>("inventory")

    if (!settings.enableStock) {
      return {
        ok: true,
        entity: "inventory",
        direction: "medusa_to_odoo",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        durationMs: Date.now() - started,
        message: "Stock sync is disabled.",
      }
    }

    const mappings = (settings.locationMappings ?? []).filter(
      (m) => m.medusaLocationId && m.odooWarehouseId
    )

    try {
      const activeScope =
        scope ?? (this.container_ as { resolve?: (k: string) => unknown })

      let resolvedLevels = levelsInput ?? []
      if (!resolvedLevels.length && typeof activeScope?.resolve === "function") {
        const query = activeScope.resolve(ContainerRegistrationKeys.QUERY) as
          | {
              graph: (args: Record<string, unknown>) => Promise<{
                data: Array<{
                  id: string
                  sku?: string | null
                  location_levels?: Array<{
                    location_id?: string | null
                    stocked_quantity?: number | null
                  }>
                }>
              }>
            }
          | undefined

        if (query) {
          const { data } = await query
            .graph({
              entity: "inventory_item",
              fields: [
                "id",
                "sku",
                "location_levels.location_id",
                "location_levels.stocked_quantity",
              ],
              pagination: { take: 5000 },
            })
            .catch(() => ({ data: [] }))

          const extracted: Array<{ locationId: string; sku: string; qty: number }> = []
          for (const item of data) {
            if (!item.sku) continue
            for (const ll of item.location_levels ?? []) {
              if (!ll?.location_id) continue
              extracted.push({
                locationId: String(ll.location_id),
                sku: String(item.sku),
                qty: Number(ll.stocked_quantity ?? 0),
              })
            }
          }
          resolvedLevels = extracted
        }
      }

      if (!mappings.length && !resolvedLevels.length) {
        return {
          ok: true,
          entity: "inventory",
          direction: "medusa_to_odoo",
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
          durationMs: Date.now() - started,
          message: "No warehouse location mappings configured.",
        }
      }

      const client = await this.getOdooClient()
      let updated = 0
      let failed = 0

      if (mappings.length > 0) {
        for (const map of mappings) {
          const locationLevels = resolvedLevels
            .filter((l) => l.locationId === map.medusaLocationId)
            .map((l) => ({ sku: l.sku, qty: l.qty }))

          if (!locationLevels.length) continue
          const res = await client.writeWarehouseStockBySkus({
            levels: locationLevels,
            warehouseId: map.odooWarehouseId,
          })
          updated += res.updated
          failed += res.failed
        }
      } else {
        const res = await client.writeWarehouseStockBySkus({
          levels: resolvedLevels.map((l) => ({ sku: l.sku, qty: l.qty })),
          warehouseId: 1,
        })
        updated += res.updated
        failed += res.failed
      }

      const durationMs = Date.now() - started
      const message = `Medusa → Odoo inventory: ${updated} levels written${failed ? `, ${failed} failed` : ""}.`
      const log = await this.logSync({
        entityType: "inventory",
        direction: "medusa_to_odoo",
        trigger,
        status: failed > 0 ? "failed" : "success",
        updated,
        failed,
        durationMs,
        message,
      })

      return {
        ok: failed === 0,
        entity: "inventory",
        direction: "medusa_to_odoo",
        created: 0,
        updated,
        skipped: 0,
        failed,
        durationMs,
        message,
        logId: log.id,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        entity: "inventory",
        direction: "medusa_to_odoo",
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        durationMs,
        message: msg,
      }
    }
  }

  async syncInventory(
    scope?: { resolve: (key: string) => unknown },
    directionOverride?: OdooSyncDirection,
    trigger = "manual"
  ): Promise<OdooSyncResult> {
    const settings =
      await this.getSectionSettings<OdooInventorySyncSettings>("inventory")
    const dir = directionOverride ?? settings.direction ?? "odoo_to_medusa"
    if (dir === "medusa_to_odoo") {
      return this.exportInventoryToOdoo(scope, undefined, trigger)
    }
    return this.importInventoryFromOdoo(scope, undefined, trigger)
  }

  async reconcileInventory(params?: {
    scope?: { resolve: (key: string) => unknown }
    variants?: Array<{
      variantId: string
      productId?: string
      sku: string
      locationId?: string
      inventoryLevelId?: string
      inventoryItemId?: string
      medusaQty: number
    }>
    strategyOverride?: "odoo_wins" | "medusa_wins" | "manual_conflict"
    driftThresholdOverride?: number
    triggeredBy?: string
    onUpdateMedusaStock?: (
      variantId: string,
      newQty: number
    ) => Promise<void>
  }): Promise<OdooReconciliationResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooReconciliationSettings>("reconciliation")
    const strategy =
      params?.strategyOverride ?? settings.strategy ?? "odoo_wins"
    const driftThreshold =
      params?.driftThresholdOverride ?? settings.driftThreshold ?? 0
    const defaultOdooLocationId = settings.defaultOdooLocationId ?? 8

    const recLog = await this.createErpReconciliationLogs({
      reconciliation_type: "inventory",
      strategy,
      drift_threshold: driftThreshold,
      triggered_by: params?.triggeredBy ?? "manual",
      status: "running",
      started_at: new Date(),
    })

    const result: OdooReconciliationResult = {
      ok: true,
      reconciliationLogId: recLog.id,
      checked: 0,
      matched: 0,
      drifted: 0,
      fixed: 0,
      conflicts: 0,
      errors: 0,
      details: [],
      durationMs: 0,
    }

    try {
      const client = await this.getOdooClient()
      const activeScope =
        params?.scope ??
        (this.container_ as { resolve?: (k: string) => unknown })

      let variantsToCheck = params?.variants ?? []

      if (!variantsToCheck.length && typeof activeScope?.resolve === "function") {
        const query = activeScope.resolve(ContainerRegistrationKeys.QUERY) as
          | {
              graph: (args: Record<string, unknown>) => Promise<{
                data: Array<Record<string, unknown>>
              }>
            }
          | undefined

        if (query) {
          const variantFields = [
            "id",
            "sku",
            "barcode",
            "product_id",
            "inventory_items.inventory.id",
            "inventory_items.inventory.sku",
            "inventory_items.inventory.location_levels.id",
            "inventory_items.inventory.location_levels.location_id",
            "inventory_items.inventory.location_levels.stocked_quantity",
          ]
          let { data } = await query
            .graph({
              entity: "product_variant",
              fields: variantFields,
              pagination: { take: 1000 },
            })
            .catch(() => ({ data: [] as Array<Record<string, unknown>> }))

          if (!data?.length) {
            const fallback = await query
              .graph({
                entity: "variant",
                fields: variantFields,
                pagination: { take: 1000 },
              })
              .catch(() => ({ data: [] as Array<Record<string, unknown>> }))
            data = fallback.data ?? []
          }

          variantsToCheck = (data ?? [])
            .map((v) => {
              const invItems = Array.isArray(v.inventory_items)
                ? (v.inventory_items as Array<Record<string, unknown>>)
                : []
              const firstInv =
                (invItems[0]?.inventory as Record<string, unknown> | undefined) ??
                invItems[0]
              const levels = Array.isArray(firstInv?.location_levels)
                ? (firstInv.location_levels as Array<Record<string, unknown>>)
                : []
              const firstLevel = levels[0]
              const sku =
                (typeof v.sku === "string" && v.sku) ||
                (typeof v.barcode === "string" && v.barcode) ||
                (typeof firstInv?.sku === "string" && firstInv.sku) ||
                ""

              return {
                variantId: String(v.id),
                productId:
                  typeof v.product_id === "string" ? v.product_id : undefined,
                sku,
                locationId:
                  typeof firstLevel?.location_id === "string"
                    ? firstLevel.location_id
                    : undefined,
                inventoryLevelId:
                  typeof firstLevel?.id === "string"
                    ? firstLevel.id
                    : undefined,
                inventoryItemId:
                  typeof firstInv?.id === "string" ? firstInv.id : undefined,
                medusaQty: Number(firstLevel?.stocked_quantity ?? 0),
              }
            })
            .filter((item) => Boolean(item.sku))
        }
      }

      if (!variantsToCheck.length) {
        const variantMappings = await this.listErpMappings(
          { entity_type: "variant" },
          { take: 1000 }
        ).catch(() => [])
        variantsToCheck = variantMappings
          .map((m) => {
            const meta = m.metadata as Record<string, unknown> | null | undefined
            const sku =
              typeof meta?.sku === "string" && meta.sku
                ? meta.sku
                : String(m.medusa_id)
            return {
              variantId: String(m.medusa_id),
              sku,
              medusaQty:
                typeof meta?.medusaQty === "number" ? meta.medusaQty : 0,
            }
          })
          .filter((item) => Boolean(item.sku))
      }

      const inventoryModule =
        typeof activeScope?.resolve === "function"
          ? (activeScope.resolve(Modules.INVENTORY) as
              | {
                  listInventoryLevels?: (
                    filter: Record<string, unknown>
                  ) => Promise<Array<{ id: string }>>
                  updateInventoryLevels?: (
                    data: Array<Record<string, unknown>>
                  ) => Promise<unknown>
                }
              | undefined)
          : undefined

      for (const item of variantsToCheck) {
        try {
          result.checked++
          const found = await client.findProductByBarcodeOrSku(item.sku)
          if (!found) continue

          await this.upsertMapping({
            entityType: "variant",
            medusaId: item.variantId,
            odooId: found.id,
            direction: "bidirectional",
            odooModel: "product.product",
            metadata: { sku: item.sku, medusaQty: item.medusaQty },
          })

          const odooQty = found.stockedQty
          const delta = Math.abs(item.medusaQty - odooQty)
          const detail: OdooReconciliationDetail = {
            variantId: item.variantId,
            sku: item.sku,
            odooProductId: found.id,
            locationId: item.locationId,
            odooLocationId: defaultOdooLocationId,
            medusaQty: item.medusaQty,
            odooQty,
            delta,
            action: "none",
          }

          if (delta <= driftThreshold) {
            result.matched++
          } else {
            result.drifted++
            if (strategy === "odoo_wins") {
              if (params?.onUpdateMedusaStock) {
                await params.onUpdateMedusaStock(item.variantId, odooQty)
              } else if (inventoryModule?.updateInventoryLevels) {
                if (item.inventoryLevelId) {
                  await inventoryModule.updateInventoryLevels([
                    { id: item.inventoryLevelId, stocked_quantity: odooQty },
                  ])
                } else if (
                  inventoryModule.listInventoryLevels &&
                  (item.inventoryItemId || item.variantId)
                ) {
                  const existingLevels = await inventoryModule.listInventoryLevels(
                    {
                      inventory_item_id: item.inventoryItemId ?? item.variantId,
                      ...(item.locationId ? { location_id: item.locationId } : {}),
                    }
                  )
                  if (existingLevels?.[0]?.id) {
                    await inventoryModule.updateInventoryLevels([
                      { id: existingLevels[0].id, stocked_quantity: odooQty },
                    ])
                  }
                }
              }
              detail.action = "fixed_medusa"
              result.fixed++
            } else if (strategy === "medusa_wins") {
              await client.updateStockQuantity(
                found.id,
                defaultOdooLocationId,
                item.medusaQty
              )
              detail.action = "fixed_odoo"
              result.fixed++
            } else {
              detail.action = "conflict"
              result.conflicts++
              await this.createErpConflictResolutions({
                entity_type: "inventory",
                medusa_id: item.variantId,
                odoo_id: found.id,
                field_name: "stocked_quantity",
                medusa_value: { qty: item.medusaQty, sku: item.sku },
                odoo_value: { qty: odooQty, sku: item.sku },
                strategy: "manual_conflict",
                status: "open",
              })
            }
          }

          await this.createErpInventorySnapshots({
            product_id: item.productId ?? "",
            variant_id: item.variantId,
            sku: item.sku,
            location_id: item.locationId ?? "",
            odoo_product_id: found.id,
            odoo_location_id: defaultOdooLocationId,
            quantity_medusa: item.medusaQty,
            quantity_odoo: odooQty,
            delta,
            reconciled: detail.action !== "conflict",
            resolution_action: detail.action,
            snapshot_at: new Date(),
          })

          result.details.push(detail)
        } catch {
          result.errors++
        }
      }

      result.durationMs = Date.now() - started
      result.ok = result.errors === 0

      await this.updateErpReconciliationLogs({
        id: recLog.id,
        status: result.errors > 0 ? "failed" : "completed",
        checked_count: result.checked,
        matched_count: result.matched,
        drifted_count: result.drifted,
        fixed_count: result.fixed,
        conflict_count: result.conflicts,
        error_count: result.errors,
        details: { items: result.details },
        completed_at: new Date(),
      })

      return result
    } catch (err) {
      result.ok = false
      result.errors++
      result.durationMs = Date.now() - started
      await this.updateErpReconciliationLogs({
        id: recLog.id,
        status: "failed",
        error_count: result.errors,
        completed_at: new Date(),
      })
      return result
    }
  }

  // ─── Order, Invoice & Payment Sync ─────────────────────────────────────────

  async syncOrderToOdoo(params: {
    order: {
      id: string
      email: string
      currency_code?: string
      payment_status?: string
      fulfillment_status?: string
      metadata?: Record<string, unknown> | null
      customer?: {
        id?: string
        first_name?: string | null
        last_name?: string | null
        email?: string | null
        phone?: string | null
      } | null
      items: Array<{
        title: string
        quantity: number
        unit_price: number
        variant_sku?: string | null
      }>
    }
    manual?: boolean
  }): Promise<OdooOrderSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooOrderSyncSettings>("orders")
    const order = params.order

    if (!settings.orderSync && !params.manual) {
      return {
        ok: true,
        skipped: true,
        orderId: order.id,
        message: "Order sync is disabled.",
      }
    }

    const existingMappedId =
      (order.metadata?.odoo_order_id != null
        ? Number(order.metadata.odoo_order_id)
        : null) ?? (await this.getOdooId("order", order.id))

    if (existingMappedId) {
      return {
        ok: true,
        skipped: true,
        orderId: order.id,
        odooOrderId: existingMappedId,
        message: `Already synced to Odoo sale.order #${existingMappedId}.`,
      }
    }

    try {
      const client = await this.getOdooClient()

      // Check if order already exists in Odoo by client_order_ref
      const remoteExisting = await client.getOrderByMedusaId(order.id)
      if (remoteExisting) {
        await this.upsertMapping({
          entityType: "order",
          medusaId: order.id,
          odooId: remoteExisting.id,
          direction: "medusa_to_odoo",
          odooModel: "sale.order",
        })
        return {
          ok: true,
          skipped: true,
          orderId: order.id,
          odooOrderId: remoteExisting.id,
          message: `Matched existing Odoo sale.order #${remoteExisting.id}.`,
        }
      }

      // 1. Resolve or create customer in Odoo
      const customerEmail =
        order.customer?.email || order.email || `guest-${order.id}@example.com`
      const customerName =
        [order.customer?.first_name, order.customer?.last_name]
          .filter(Boolean)
          .join(" ") || customerEmail

      const partnerRes = await client.upsertCustomer(
        order.customer?.id || order.id,
        {
          name: customerName,
          email: customerEmail,
          ...(order.customer?.phone ? { phone: order.customer.phone } : {}),
        }
      )

      // 2. Resolve each line item SKU to Odoo product.product
      const orderLines = []
      for (const item of order.items || []) {
        const sku = (item.variant_sku || "").trim()
        if (!sku) {
          if (settings.failOnUnmatchedSku !== false) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `Order line "${item.title}" has no SKU; cannot match Odoo product.`
            )
          }
          continue
        }

        const odooProduct = await client.findProductByBarcodeOrSku(sku)
        if (!odooProduct) {
          if (settings.failOnUnmatchedSku !== false) {
            throw new MedusaError(
              MedusaError.Types.NOT_FOUND,
              `Order line SKU "${sku}" not found in Odoo product.product.`
            )
          }
          continue
        }

        orderLines.push({
          product_id: odooProduct.id,
          product_uom_qty: item.quantity,
          price_unit: item.unit_price,
          name: item.title,
        })
      }

      if (!orderLines.length) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Order ${order.id} has no matchable line items.`
        )
      }

      // 3. Create sale.order + lines
      const odooOrderId = await client.createSaleOrder(
        {
          partner_id: partnerRes.id,
          client_order_ref: order.id,
        },
        orderLines
      )

      if (settings.confirmOrderInOdoo !== false) {
        await client.confirmSaleOrder(odooOrderId)
      }

      // 4. Optional Invoice & Payment creation
      const isPaid = PAID_STATUSES.has(order.payment_status ?? "")
      const isFulfilled = FULFILLED_STATUSES.has(order.fulfillment_status ?? "")
      const shouldInvoice =
        Boolean(settings.exportInvoice) &&
        (!settings.invoiceMode ||
          settings.invoiceMode === "all" ||
          (settings.invoiceMode === "paid" && isPaid) ||
          (settings.invoiceMode === "fulfilled" && isFulfilled))

      let odooInvoiceId: number | null = null
      let odooPaymentId: number | null = null

      if (shouldInvoice) {
        odooInvoiceId = await client.createAndPostInvoice({
          partnerId: partnerRes.id,
          orderId: odooOrderId,
          originName: order.id,
          lines: orderLines,
        })

        if (settings.createPayment || settings.markInvoicePaid) {
          odooPaymentId = await client.registerInvoicePayment({
            invoiceId: odooInvoiceId,
            journalId: settings.paymentJournalId ?? null,
          })
        }
      }

      await this.upsertMapping({
        entityType: "order",
        medusaId: order.id,
        odooId: odooOrderId,
        direction: "medusa_to_odoo",
        odooModel: "sale.order",
        metadata: {
          odooInvoiceId,
          odooPaymentId,
        },
      })

      await this.logSync({
        entityType: "order",
        direction: "medusa_to_odoo",
        trigger: params.manual ? "manual" : "event",
        status: "success",
        created: 1,
        durationMs: Date.now() - started,
        message: `Synced order ${order.id} → Odoo sale.order #${odooOrderId}${odooInvoiceId ? ` (invoice #${odooInvoiceId})` : ""}.`,
      })

      return {
        ok: true,
        orderId: order.id,
        odooOrderId,
        odooInvoiceId,
        odooPaymentId,
        message: `Synced order ${order.id} → Odoo sale.order #${odooOrderId}.`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.recordFailure({
        entityType: "order",
        medusaId: order.id,
        direction: "medusa_to_odoo",
        trigger: params.manual ? "manual" : "event",
        errorMessage: msg,
      })
      await this.logSync({
        entityType: "order",
        direction: "medusa_to_odoo",
        trigger: params.manual ? "manual" : "event",
        status: "failed",
        failed: 1,
        durationMs: Date.now() - started,
        message: `Order ${order.id}: ${msg}`,
      })
      return {
        ok: false,
        orderId: order.id,
        message: msg,
      }
    }
  }

  /**
   * Cancel a synced sale.order in Odoo when the corresponding Medusa order is cancelled.
   */
  async cancelOrderInOdoo(
    medusaOrderId: string,
    trigger = "event"
  ): Promise<{ ok: boolean; odooOrderId: number | null; message: string }> {
    const started = Date.now()
    const odooOrderId = await this.getOdooId("order", medusaOrderId)
    if (!odooOrderId) {
      return {
        ok: true,
        odooOrderId: null,
        message: `Order ${medusaOrderId} is not mapped in Odoo; skipping cancellation.`,
      }
    }

    try {
      const client = await this.getOdooClient()
      await client.rpc("sale.order", "action_cancel", [[odooOrderId]])

      const durationMs = Date.now() - started
      await this.logSync({
        entityType: "order",
        direction: "medusa_to_odoo",
        trigger,
        status: "success",
        updated: 1,
        durationMs,
        message: `Cancelled Odoo sale.order #${odooOrderId} for Medusa order ${medusaOrderId}`,
      })

      return {
        ok: true,
        odooOrderId,
        message: `Cancelled Odoo sale.order #${odooOrderId} for Medusa order ${medusaOrderId}`,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      await this.logSync({
        entityType: "order",
        direction: "medusa_to_odoo",
        trigger,
        status: "failed",
        failed: 1,
        durationMs,
        message: `Failed to cancel Odoo sale.order #${odooOrderId}: ${msg}`,
      })
      return {
        ok: false,
        odooOrderId,
        message: msg,
      }
    }
  }

  // ─── Two-Way Customer Sync ─────────────────────────────────────────────────

  async syncCustomers(params?: {
    scope?: unknown
    customerIds?: string[]
    directionOverride?: OdooSyncDirection
    medusaCustomers?: Array<{
      id: string
      email: string
      first_name?: string | null
      last_name?: string | null
      phone?: string | null
      company_name?: string | null
      addresses?: Array<{
        address_1?: string | null
        city?: string | null
        postal_code?: string | null
        country_code?: string | null
      }> | null
    }>
    onUpsertMedusaCustomer?: (partner: {
      odooId: number
      email: string
      firstName: string
      lastName: string
      phone?: string | null
    }) => Promise<string>
    trigger?: string
  }): Promise<OdooSyncResult> {
    const started = Date.now()
    const settings =
      await this.getSectionSettings<OdooCustomerSyncSettings>("customers")
    const direction =
      params?.directionOverride ?? settings.direction ?? "bidirectional"
    const trigger = params?.trigger ?? "manual"

    if (settings.enableCustomerSync === false) {
      return {
        ok: true,
        entity: "customer",
        direction,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        durationMs: Date.now() - started,
        message: "Customer sync is disabled.",
      }
    }

    try {
      const client = await this.getOdooClient()
      let created = 0
      let updated = 0
      let skipped = 0
      let failed = 0

      if (
        direction === "odoo_to_medusa" ||
        direction === "bidirectional"
      ) {
        const partners = await client.fetchCustomers(500)
        for (const p of partners) {
          const email =
            typeof p.email === "string" ? p.email.trim().toLowerCase() : ""
          if (!email) {
            skipped++
            continue
          }
          const parts = (p.name || email).trim().split(/\s+/)
          const firstName = parts[0] || ""
          const lastName = parts.slice(1).join(" ")

          try {
            const existingMedusaId = await this.getMedusaId("customer", p.id)
            let medusaId = existingMedusaId ?? `cus_odoo_${p.id}`
            if (params?.onUpsertMedusaCustomer) {
              medusaId = await params.onUpsertMedusaCustomer({
                odooId: p.id,
                email,
                firstName,
                lastName,
                phone: typeof p.phone === "string" ? p.phone : null,
              })
            } else {
              const customerMod = this.resolveMedusaService<{
                listCustomers?: (
                  filters: Record<string, unknown>,
                  config?: Record<string, unknown>
                ) => Promise<Array<{ id: string }>>
                createCustomers?: (
                  data: Record<string, unknown>
                ) => Promise<{ id: string } | Array<{ id: string }>>
                updateCustomers?: (
                  idOrSelector: unknown,
                  data?: Record<string, unknown>
                ) => Promise<unknown>
              }>(Modules.CUSTOMER, params?.scope)

              if (
                customerMod?.listCustomers &&
                customerMod?.createCustomers &&
                customerMod?.updateCustomers
              ) {
                try {
                  if (existingMedusaId) {
                    await customerMod.updateCustomers(existingMedusaId, {
                      first_name: firstName,
                      last_name: lastName,
                      phone: typeof p.phone === "string" ? p.phone : undefined,
                    })
                    medusaId = existingMedusaId
                  } else {
                    const byEmail = await customerMod.listCustomers(
                      { email },
                      { take: 1 }
                    )
                    if (byEmail?.[0]?.id) {
                      medusaId = byEmail[0].id
                      await customerMod.updateCustomers(medusaId, {
                        first_name: firstName,
                        last_name: lastName,
                        phone:
                          typeof p.phone === "string" ? p.phone : undefined,
                      })
                    } else {
                      const createdCust = await customerMod.createCustomers({
                        email,
                        first_name: firstName,
                        last_name: lastName,
                        phone:
                          typeof p.phone === "string" ? p.phone : undefined,
                        metadata: { odoo_partner_id: p.id },
                      })
                      const custObj = Array.isArray(createdCust)
                        ? createdCust[0]
                        : createdCust
                      if (custObj?.id) {
                        medusaId = custObj.id
                      }
                    }
                  }
                } catch {
                  // Fallback to synthetic ID if Medusa customer module unavailable
                }
              }
            }
            await this.upsertMapping({
              entityType: "customer",
              medusaId,
              odooId: p.id,
              direction: "odoo_to_medusa",
              odooModel: "res.partner",
            })
            if (existingMedusaId) updated++
            else created++
          } catch {
            failed++
          }
        }
      }

      if (
        direction === "medusa_to_odoo" ||
        direction === "bidirectional"
      ) {
        let medusaCustomers = params?.medusaCustomers
        if (!medusaCustomers) {
          const query = this.resolveQueryGraph(params?.scope)
          if (query) {
            try {
              const filters: Record<string, unknown> = {}
              if (params?.customerIds?.length) {
                filters.id = params.customerIds
              }
              const { data: queriedCustomers } = await query.graph({
                entity: "customer",
                fields: [
                  "id",
                  "email",
                  "first_name",
                  "last_name",
                  "phone",
                  "company_name",
                  "addresses.*",
                ],
                filters,
              })
              medusaCustomers = (queriedCustomers ?? []) as NonNullable<
                typeof medusaCustomers
              >
            } catch {
              medusaCustomers = []
            }
          }
        }

        for (const c of medusaCustomers ?? []) {
          if (!c.email) {
            skipped++
            continue
          }
          try {
            const existingOdooId = await this.getOdooId("customer", c.id)
            const name =
              [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email
            const primaryAddr = Array.isArray(c.addresses)
              ? c.addresses[0]
              : undefined
            const res = await client.upsertCustomer(
              c.id,
              {
                name,
                email: c.email.trim().toLowerCase(),
                ...(c.phone ? { phone: c.phone } : {}),
                ...(c.company_name ? { company_name: c.company_name } : {}),
                ...(primaryAddr?.address_1
                  ? { street: primaryAddr.address_1 }
                  : {}),
                ...(primaryAddr?.city ? { city: primaryAddr.city } : {}),
                ...(primaryAddr?.postal_code
                  ? { zip: primaryAddr.postal_code }
                  : {}),
              },
              existingOdooId
            )
            await this.upsertMapping({
              entityType: "customer",
              medusaId: c.id,
              odooId: res.id,
              direction: "medusa_to_odoo",
              odooModel: "res.partner",
            })
            if (res.created) created++
            else updated++
          } catch {
            failed++
          }
        }
      }

      const durationMs = Date.now() - started
      const message = `Customer sync (${direction}): ${created} created, ${updated} updated, ${skipped} skipped${failed ? `, ${failed} failed` : ""}.`
      const log = await this.logSync({
        entityType: "customer",
        direction,
        trigger,
        status: failed > 0 ? "failed" : "success",
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
      })

      return {
        ok: failed === 0,
        entity: "customer",
        direction,
        created,
        updated,
        skipped,
        failed,
        durationMs,
        message,
        logId: log.id,
      }
    } catch (err) {
      const durationMs = Date.now() - started
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        entity: "customer",
        direction,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
        durationMs,
        message: msg,
      }
    }
  }

  // ─── Barcode Resolution Engine (POS & Warehouse) ───────────────────────────

  async resolveBarcode(params: {
    barcode: string
    context?: OdooBarcodeContext
    scope?: unknown
    deviceId?: string | null
    sessionId?: string | null
    operatorId?: string | null
    medusaCatalogLookup?: (barcode: string) => Promise<{
      variantId: string
      productId: string
      sku: string
      title: string
      unitPriceCents: number
      stockedQty?: number
      imageUrl?: string
    } | null>
  }): Promise<OdooBarcodeResolutionResult> {
    const start = Date.now()
    const barcode = params.barcode.trim()
    const context: OdooBarcodeContext = params.context ?? "pos"
    const posSettings = await this.getSectionSettings<OdooPosSettings>("pos")

    const cacheKey = `${context}:${barcode}`
    if (posSettings.enableBarcodeCache !== false) {
      const cached = this.barcodeCache_.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        const latencyMs = Date.now() - start
        odooMetrics.recordBarcodeLookup({
          context,
          source: "memory_cache",
          found: true,
        })
        await this.createBarcodeScanLogs({
          barcode,
          context,
          variant_id: cached.result.variantId ?? null,
          odoo_product_id: cached.result.odooProductId ?? null,
          source: "memory_cache",
          resolution_status: "resolved",
          latency_ms: latencyMs,
          device_id: params.deviceId ?? null,
          session_id: params.sessionId ?? null,
          operator_id: params.operatorId ?? null,
          scan_timestamp: new Date(),
        })
        return {
          ...cached.result,
          deviceId: params.deviceId ?? undefined,
          sessionId: params.sessionId ?? undefined,
          operatorId: params.operatorId ?? undefined,
          source: "memory_cache",
          latencyMs,
          resolvedAt: new Date().toISOString(),
        }
      }
    }

    // 1. POS context checks Medusa catalog first (via callback or query.graph)
    if (context === "pos") {
      let medusaHit = params.medusaCatalogLookup
        ? await params.medusaCatalogLookup(barcode)
        : null

      if (!medusaHit && !params.medusaCatalogLookup) {
        const query = this.resolveQueryGraph(params.scope)
        if (query) {
          try {
            for (const filterField of ["barcode", "ean", "upc", "sku"]) {
              const { data: variants } = await query.graph({
                entity: "product_variant",
                fields: [
                  "id",
                  "title",
                  "sku",
                  "barcode",
                  "product_id",
                  "product.id",
                  "product.title",
                  "product.thumbnail",
                  "prices.*",
                ],
                filters: { [filterField]: barcode },
              })
              const v = variants?.[0] as
                | {
                    id?: string
                    title?: string
                    sku?: string
                    product_id?: string
                    product?: {
                      id?: string
                      title?: string
                      thumbnail?: string
                    }
                    prices?: Array<{ amount?: number }>
                  }
                | undefined
              if (v?.id) {
                const rawAmount = v.prices?.[0]?.amount ?? 0
                medusaHit = {
                  variantId: v.id,
                  productId: v.product_id ?? v.product?.id ?? "",
                  sku: v.sku ?? barcode,
                  title: v.product?.title
                    ? `${v.product.title}${v.title ? ` - ${v.title}` : ""}`
                    : (v.title ?? barcode),
                  unitPriceCents: Math.round(Number(rawAmount)),
                  imageUrl: v.product?.thumbnail,
                }
                break
              }
            }
          } catch {
            // Fall through to Odoo lookup
          }
        }
      }

      if (medusaHit) {
        const odooProductId = await this.getOdooId(
          "variant",
          medusaHit.variantId
        )
        const baseResult = {
          found: true,
          barcode,
          context,
          variantId: medusaHit.variantId,
          productId: medusaHit.productId,
          sku: medusaHit.sku,
          title: medusaHit.title,
          unitPriceCents: medusaHit.unitPriceCents,
          odooProductId: odooProductId ?? undefined,
          stockedQty: medusaHit.stockedQty,
          availableQty: medusaHit.stockedQty,
          imageUrl: medusaHit.imageUrl,
          deviceId: params.deviceId ?? undefined,
          sessionId: params.sessionId ?? undefined,
          operatorId: params.operatorId ?? undefined,
        }

        const ttlSec = posSettings.posCacheTtlSeconds ?? 3600
        this.barcodeCache_.set(cacheKey, {
          result: baseResult,
          expiresAt: Date.now() + ttlSec * 1000,
        })

        const latencyMs = Date.now() - start
        odooMetrics.recordBarcodeLookup({
          context,
          source: "medusa_db",
          found: true,
        })
        await this.createBarcodeScanLogs({
          barcode,
          context,
          variant_id: medusaHit.variantId,
          odoo_product_id: odooProductId ?? null,
          source: "medusa_db",
          resolution_status: "resolved",
          latency_ms: latencyMs,
          device_id: params.deviceId ?? null,
          session_id: params.sessionId ?? null,
          operator_id: params.operatorId ?? null,
          scan_timestamp: new Date(),
        })

        return {
          ...baseResult,
          source: "medusa_db",
          latencyMs,
          resolvedAt: new Date().toISOString(),
        }
      }
    }

    // 2. Query Odoo product.product by barcode or default_code
    try {
      const client = await this.getOdooClient()
      const odooHit = await client.findProductByBarcodeOrSku(barcode)
      if (odooHit) {
        const mappedVariantId = await this.getMedusaId("variant", odooHit.id)
        const source =
          context === "pos" && mappedVariantId ? "erp_mapping" : "odoo_db"

        const baseResult = {
          found: true,
          barcode,
          context,
          variantId: mappedVariantId ?? undefined,
          sku: odooHit.sku,
          title: odooHit.name,
          odooProductId: odooHit.id,
          odooProductName: odooHit.name,
          odooUom: odooHit.uomName,
          stockedQty: odooHit.stockedQty,
          availableQty: odooHit.availableQty,
          deviceId: params.deviceId ?? undefined,
          sessionId: params.sessionId ?? undefined,
          operatorId: params.operatorId ?? undefined,
        }

        const ttlSec =
          context === "pos"
            ? (posSettings.posCacheTtlSeconds ?? 3600)
            : (posSettings.warehouseCacheTtlSeconds ?? 14400)

        this.barcodeCache_.set(cacheKey, {
          result: baseResult,
          expiresAt: Date.now() + ttlSec * 1000,
        })

        const latencyMs = Date.now() - start
        odooMetrics.recordBarcodeLookup({
          context,
          source,
          found: true,
        })
        await this.createBarcodeScanLogs({
          barcode,
          context,
          variant_id: mappedVariantId ?? null,
          odoo_product_id: odooHit.id,
          source,
          resolution_status: "resolved",
          latency_ms: latencyMs,
          device_id: params.deviceId ?? null,
          session_id: params.sessionId ?? null,
          operator_id: params.operatorId ?? null,
          scan_timestamp: new Date(),
        })

        return {
          ...baseResult,
          source,
          latencyMs,
          resolvedAt: new Date().toISOString(),
        }
      }
    } catch {
      // Fall through to not-found response
    }

    const latencyMs = Date.now() - start
    odooMetrics.recordBarcodeLookup({
      context,
      source: "none",
      found: false,
    })
    await this.createBarcodeScanLogs({
      barcode,
      context,
      source: "none",
      resolution_status: "not_found",
      latency_ms: latencyMs,
      device_id: params.deviceId ?? null,
      session_id: params.sessionId ?? null,
      operator_id: params.operatorId ?? null,
      scan_timestamp: new Date(),
    })

    return {
      found: false,
      barcode,
      context,
      deviceId: params.deviceId ?? undefined,
      sessionId: params.sessionId ?? undefined,
      operatorId: params.operatorId ?? undefined,
      source: "none",
      latencyMs,
      resolvedAt: new Date().toISOString(),
    }
  }

  async invalidateBarcodeCache(
    barcode?: string,
    context?: OdooBarcodeContext
  ): Promise<void> {
    if (!barcode) {
      this.barcodeCache_.clear()
      return
    }
    if (context) {
      this.barcodeCache_.delete(`${context}:${barcode.trim()}`)
      return
    }
    for (const key of this.barcodeCache_.keys()) {
      if (key.endsWith(`:${barcode.trim()}`)) {
        this.barcodeCache_.delete(key)
      }
    }
  }

  async warmBarcodeCache(
    barcodes: string[],
    context: OdooBarcodeContext = "pos"
  ): Promise<{ warmed: number; failed: number }> {
    let warmed = 0
    let failed = 0
    for (const code of barcodes) {
      const res = await this.resolveBarcode({ barcode: code, context })
      if (res.found) warmed++
      else failed++
    }
    return { warmed, failed }
  }

  // ─── Offline POS Transaction Queue & Replay ────────────────────────────────

  async enqueueOfflinePosTransaction(input: OfflinePosEnqueueInput) {
    const existing = await this.listOfflinePosTransactions(
      { external_transaction_id: input.externalTransactionId },
      { take: 1 }
    )
    if (existing?.[0]) {
      return existing[0]
    }

    return this.createOfflinePosTransactions({
      external_transaction_id: input.externalTransactionId,
      device_id: input.deviceId ?? null,
      session_id: input.sessionId ?? null,
      pos_location_id: input.posLocationId ?? null,
      cart_id: input.cartId ?? null,
      payment_method: input.paymentMethod ?? null,
      customer_id: input.customerId ?? null,
      customer_email: input.customerEmail ?? null,
      currency: (input.currency ?? "USD").toUpperCase(),
      total_cents: input.totalCents,
      discount_cents: input.discountCents ?? 0,
      items: { lines: input.items },
      status: "pending",
      replay_attempt_count: 0,
      metadata: input.metadata ?? null,
    })
  }

  async replayOfflinePosTransaction(params: {
    id: string
    syncToOdoo?: boolean
    onCreateMedusaOrder?: (txn: Record<string, unknown>) => Promise<string>
  }): Promise<OfflinePosReplayResult> {
    const rows = await this.listOfflinePosTransactions(
      { id: params.id },
      { take: 1 }
    )
    const txn = rows?.[0]
    if (!txn) {
      return {
        ok: false,
        transactionId: params.id,
        message: `Offline POS transaction ${params.id} not found.`,
      }
    }

    if (txn.status === "replayed") {
      return {
        ok: true,
        transactionId: txn.id,
        medusaOrderId: txn.medusa_order_id ?? undefined,
        odooOrderId: txn.odoo_order_id ?? null,
        message: "Transaction already replayed.",
      }
    }

    try {
      const medusaOrderId = params.onCreateMedusaOrder
        ? await params.onCreateMedusaOrder(txn)
        : `order_pos_${txn.external_transaction_id}`

      let odooOrderId: number | null = null
      if (params.syncToOdoo !== false) {
        const itemsObj = txn.items as {
          lines?: Array<{
            variantId: string
            sku?: string
            title?: string
            quantity: number
            unitPriceCents: number
          }>
        }
        const lines = itemsObj?.lines ?? []
        const orderSync = await this.syncOrderToOdoo({
          order: {
            id: medusaOrderId,
            email:
              txn.customer_email ||
              `pos-${txn.external_transaction_id}@example.com`,
            currency_code: (txn.currency || "USD").toLowerCase(),
            payment_status: "captured",
            fulfillment_status: "fulfilled",
            items: lines.map((l) => ({
              title: l.title || l.sku || l.variantId,
              quantity: l.quantity,
              unit_price: l.unitPriceCents / 100,
              variant_sku: l.sku || l.variantId,
            })),
          },
          manual: true,
        })
        if (orderSync.ok && orderSync.odooOrderId) {
          odooOrderId = orderSync.odooOrderId
        }
      }

      await this.updateOfflinePosTransactions({
        id: txn.id,
        status: "replayed",
        medusa_order_id: medusaOrderId,
        odoo_order_id: odooOrderId,
        replayed_at: new Date(),
        last_replay_at: new Date(),
        replay_error: null,
      })

      return {
        ok: true,
        transactionId: txn.id,
        medusaOrderId,
        odooOrderId,
        message: `Replayed POS transaction ${txn.external_transaction_id} → order ${medusaOrderId}.`,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await this.updateOfflinePosTransactions({
        id: txn.id,
        status: "failed",
        replay_error: msg,
        replay_attempt_count: (txn.replay_attempt_count ?? 0) + 1,
        last_replay_at: new Date(),
      })
      return {
        ok: false,
        transactionId: txn.id,
        message: msg,
      }
    }
  }

  // ─── Inbound Webhook Processing ────────────────────────────────────────────

  async processWebhookEvent(params: {
    rawBody: string | Buffer
    signatureHeader?: string | null
    payload: OdooWebhookPayload
    scope?: unknown
    executeSync?: boolean
  }): Promise<OdooWebhookProcessResult> {
    const config = await this.getConnectionConfig()
    const webhookSettings =
      await this.getSectionSettings<OdooWebhookSettings>("webhooks")
    const secret = webhookSettings.webhookSecret || config.webhookSecret

    if (secret) {
      const valid = verifyOdooWebhookSignature(
        params.rawBody,
        params.signatureHeader,
        secret
      )
      if (!valid) {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          "Invalid Odoo webhook HMAC signature"
        )
      }
    }

    const eventId =
      params.payload.event_id ||
      computeExternalChecksum({
        event: params.payload.event,
        record_id: params.payload.record_id,
        data: params.payload.data,
      })

    const existing = await this.listOdooWebhookEvents(
      { event_id: eventId },
      { take: 1 }
    )
    if (existing?.[0]) {
      return {
        ok: true,
        duplicate: true,
        eventId,
        event: params.payload.event,
        actionTaken: "ignored_duplicate",
      }
    }

    let actionTaken = "logged"
    const evt = params.payload.event
    const recordId =
      params.payload.record_id ??
      (typeof params.payload.data?.id === "number"
        ? params.payload.data.id
        : null)

    if (
      evt.startsWith("product.") &&
      webhookSettings.autoProcessProductEvents !== false
    ) {
      actionTaken = "queued_product_sync"
      if (params.executeSync !== false) {
        try {
          await this.importProductsFromOdoo({ trigger: "webhook" })
        } catch {
          // Best-effort sync during webhook ingestion
        }
      }
    } else if (
      evt.startsWith("stock.") &&
      webhookSettings.autoProcessStockEvents !== false
    ) {
      actionTaken = "queued_inventory_sync"
      if (typeof params.payload.data?.barcode === "string") {
        await this.invalidateBarcodeCache(params.payload.data.barcode)
      }
      if (params.executeSync !== false) {
        try {
          await this.importInventoryFromOdoo({ trigger: "webhook" })
        } catch {
          // Best-effort sync during webhook ingestion
        }
      }
    } else if (
      evt.startsWith("partner.") &&
      webhookSettings.autoProcessCustomerEvents !== false
    ) {
      actionTaken = "queued_customer_sync"
      if (params.executeSync !== false) {
        try {
          await this.syncCustomers({
            directionOverride: "odoo_to_medusa",
            scope: params.scope,
            trigger: "webhook",
          })
        } catch {
          // Best-effort sync during webhook ingestion
        }
      }
    } else if (
      evt.startsWith("order.") &&
      webhookSettings.autoProcessOrderEvents !== false
    ) {
      actionTaken = "queued_order_sync"
    }

    await this.createOdooWebhookEvents({
      event_id: eventId,
      event_type: evt,
      odoo_model: params.payload.model ?? null,
      odoo_record_id: recordId,
      status: "processed",
      payload: params.payload.data ?? null,
      processed_at: new Date(),
    })

    return {
      ok: true,
      duplicate: false,
      eventId,
      event: evt,
      actionTaken,
    }
  }

  async getPrometheusMetrics(): Promise<string> {
    return odooMetrics.renderPrometheus()
  }

  async getMetricsSummary(): Promise<Record<string, unknown>> {
    return odooMetrics.toJSON()
  }
}

export default OdooModuleService

