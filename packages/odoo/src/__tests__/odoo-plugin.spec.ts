import assert from "node:assert/strict"
import crypto from "node:crypto"
import { describe, it } from "node:test"
import { OdooClient } from "../modules/odoo/client/odoo-client"
import OdooModuleService from "../modules/odoo/service"
import { odooMetrics } from "../modules/odoo/utils/metrics"
import {
  computeExternalChecksum,
  redactOdooConfig,
  slugifyHandle,
  validateSafeOdooUrl,
  verifyOdooWebhookSignature,
} from "../modules/odoo/utils/security"
import {
  createOdooSdk,
  matchesOdooQueryKeyPrefix,
  odooQueryKeys,
} from "../sdk"
import {
  OdooBarcodeLookupSchema,
  OdooConfigSchema,
  OdooTriggerSyncSchema,
} from "../api/validators"
import middlewares, {
  OdooConfigSchema as ReExportedOdooConfigSchema,
} from "../api/middlewares"
import { adminI18n, SUPPORTED_UI_LOCALES } from "../index"

class InMemoryOdooService extends OdooModuleService {
  private settingsMap = new Map<string, { id: string; key: string; value: unknown }>()
  private mappingsList: Array<Record<string, any>> = []
  private syncLogsList: Array<Record<string, any>> = []
  private failuresList: Array<Record<string, any>> = []
  private snapshotsList: Array<Record<string, any>> = []
  private recLogsList: Array<Record<string, any>> = []
  private conflictsList: Array<Record<string, any>> = []
  private barcodeLogsList: Array<Record<string, any>> = []
  private posTxnsList: Array<Record<string, any>> = []
  private webhookEventsList: Array<Record<string, any>> = []
  private seq = 1

  override async listOdooSettings(filter: Record<string, any> = {}) {
    if (filter.key) {
      const row = this.settingsMap.get(String(filter.key))
      return (row ? [row] : []) as any
    }
    return [...this.settingsMap.values()] as any
  }

  override async createOdooSettings(data: Record<string, any>) {
    const row = {
      id: `set_${this.seq++}`,
      key: String(data.key),
      value: data.value,
    }
    this.settingsMap.set(row.key, row)
    return row as any
  }

  override async updateOdooSettings(data: Record<string, any>) {
    for (const [k, v] of this.settingsMap.entries()) {
      if (v.id === data.id) {
        const updated = { ...v, value: data.value }
        this.settingsMap.set(k, updated)
        return updated as any
      }
    }
    return data as any
  }

  override async listErpMappings(filter: Record<string, any> = {}) {
    return this.mappingsList.filter((m) => {
      if (filter.entity_type && m.entity_type !== filter.entity_type)
        return false
      if (filter.medusa_id && m.medusa_id !== filter.medusa_id) return false
      if (filter.odoo_id !== undefined && m.odoo_id !== filter.odoo_id)
        return false
      return true
    }) as any
  }

  override async createErpMappings(data: Record<string, any>) {
    const row = { id: `map_${this.seq++}`, ...data }
    this.mappingsList.push(row)
    return row as any
  }

  override async updateErpMappings(data: Record<string, any>) {
    const idx = this.mappingsList.findIndex((m) => m.id === data.id)
    if (idx >= 0) {
      this.mappingsList[idx] = { ...this.mappingsList[idx], ...data }
      return this.mappingsList[idx] as any
    }
    return data as any
  }

  override async listErpSyncLogs(filter: Record<string, any> = {}) {
    return this.syncLogsList.filter((l) => {
      if (filter.entity_type && l.entity_type !== filter.entity_type)
        return false
      return true
    }) as any
  }

  override async createErpSyncLogs(data: Record<string, any>) {
    const row = { id: `log_${this.seq++}`, ...data }
    this.syncLogsList.push(row)
    return row as any
  }

  override async listErpSyncFailures(filter: Record<string, any> = {}) {
    return this.failuresList.filter((f) => {
      if (filter.resolved !== undefined && f.resolved !== filter.resolved)
        return false
      return true
    }) as any
  }

  override async createErpSyncFailures(data: Record<string, any>) {
    const row = { id: `fail_${this.seq++}`, ...data }
    this.failuresList.push(row)
    return row as any
  }

  override async updateErpSyncFailures(data: Record<string, any>) {
    const idx = this.failuresList.findIndex((f) => f.id === data.id)
    if (idx >= 0) {
      this.failuresList[idx] = { ...this.failuresList[idx], ...data }
      return this.failuresList[idx] as any
    }
    return data as any
  }

  override async listErpInventorySnapshots() {
    return this.snapshotsList as any
  }

  override async createErpInventorySnapshots(data: Record<string, any>) {
    const row = { id: `snap_${this.seq++}`, ...data }
    this.snapshotsList.push(row)
    return row as any
  }

  override async listErpReconciliationLogs() {
    return this.recLogsList as any
  }

  override async createErpReconciliationLogs(data: Record<string, any>) {
    const row = { id: `reclog_${this.seq++}`, ...data }
    this.recLogsList.push(row)
    return row as any
  }

  override async updateErpReconciliationLogs(data: Record<string, any>) {
    const idx = this.recLogsList.findIndex((r) => r.id === data.id)
    if (idx >= 0) {
      this.recLogsList[idx] = { ...this.recLogsList[idx], ...data }
      return this.recLogsList[idx] as any
    }
    return data as any
  }

  override async listErpConflictResolutions(filter: Record<string, any> = {}) {
    return this.conflictsList.filter((c) => {
      if (filter.id && c.id !== filter.id) return false
      if (filter.status && c.status !== filter.status) return false
      return true
    }) as any
  }

  override async createErpConflictResolutions(data: Record<string, any>) {
    const row = { id: `conf_${this.seq++}`, ...data }
    this.conflictsList.push(row)
    return row as any
  }

  override async updateErpConflictResolutions(data: Record<string, any>) {
    const idx = this.conflictsList.findIndex((c) => c.id === data.id)
    if (idx >= 0) {
      this.conflictsList[idx] = { ...this.conflictsList[idx], ...data }
      return this.conflictsList[idx] as any
    }
    return data as any
  }

  override async listBarcodeScanLogs() {
    return this.barcodeLogsList as any
  }

  override async createBarcodeScanLogs(data: Record<string, any>) {
    const row = { id: `scan_${this.seq++}`, ...data }
    this.barcodeLogsList.push(row)
    return row as any
  }

  override async listOfflinePosTransactions(filter: Record<string, any> = {}) {
    return this.posTxnsList.filter((t) => {
      if (filter.id && t.id !== filter.id) return false
      if (
        filter.external_transaction_id &&
        t.external_transaction_id !== filter.external_transaction_id
      )
        return false
      if (filter.status && t.status !== filter.status) return false
      return true
    }) as any
  }

  override async createOfflinePosTransactions(data: Record<string, any>) {
    const row = { id: `pos_${this.seq++}`, ...data }
    this.posTxnsList.push(row)
    return row as any
  }

  override async updateOfflinePosTransactions(data: Record<string, any>) {
    const idx = this.posTxnsList.findIndex((t) => t.id === data.id)
    if (idx >= 0) {
      this.posTxnsList[idx] = { ...this.posTxnsList[idx], ...data }
      return this.posTxnsList[idx] as any
    }
    return data as any
  }

  override async listOdooWebhookEvents(filter: Record<string, any> = {}) {
    return this.webhookEventsList.filter((e) => {
      if (filter.event_id && e.event_id !== filter.event_id) return false
      return true
    }) as any
  }

  override async createOdooWebhookEvents(data: Record<string, any>) {
    const row = { id: `wh_${this.seq++}`, ...data }
    this.webhookEventsList.push(row)
    return row as any
  }
}

describe("medusa-plugin-odoo — Security & SSRF Utilities", () => {
  it("blocks cloud metadata endpoints, non-HTTP protocols, embedded credentials, and private IPs by default", () => {
    assert.throws(
      () => validateSafeOdooUrl("http://169.254.169.254/latest/meta-data"),
      /metadata/i
    )
    assert.throws(
      () => validateSafeOdooUrl("http://metadata.google.internal"),
      /metadata/i
    )
    assert.throws(
      () => validateSafeOdooUrl("file:///etc/passwd"),
      /protocol/i
    )
    assert.throws(
      () => validateSafeOdooUrl("https://admin:secret@erp.example.com"),
      /credentials/i
    )
    assert.throws(
      () => validateSafeOdooUrl("http://localhost:8069"),
      /loopback or private/i
    )
    assert.throws(
      () => validateSafeOdooUrl("http://192.168.1.50:8069"),
      /loopback or private/i
    )

    assert.equal(
      validateSafeOdooUrl("https://erp.example.com/"),
      "https://erp.example.com"
    )
    assert.equal(
      validateSafeOdooUrl("http://localhost:8069/", {
        allowPrivateNetwork: true,
      }),
      "http://localhost:8069"
    )
  })

  it("redacts sensitive credentials in OdooConnectionConfig", () => {
    const redacted = redactOdooConfig({
      url: "https://erp.example.com",
      db: "prod_db",
      username: "admin@example.com",
      password: "super-secret-password",
      apiKey: "odoo_api_key_123456",
      webhookSecret: "whsec_abcdef123456",
    })

    assert.equal(redacted.hasPassword, true)
    assert.equal(redacted.hasApiKey, true)
    assert.equal(redacted.hasWebhookSecret, true)
    assert.ok(!redacted.password?.includes("super-secret"))
    assert.ok(!redacted.apiKey?.includes("123456"))
    assert.ok(!redacted.webhookSecret?.includes("abcdef"))
    assert.equal(redacted.password, "su****rd")
  })

  it("verifies HMAC-SHA256 webhook signatures in constant time", () => {
    const secret = "whsec_test_secret"
    const body = JSON.stringify({ event: "product.updated", data: { id: 42 } })
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex")

    assert.equal(verifyOdooWebhookSignature(body, sig, secret), true)
    assert.equal(
      verifyOdooWebhookSignature(body, `sha256=${sig}`, secret),
      true
    )
    assert.equal(
      verifyOdooWebhookSignature(`${body}x`, sig, secret),
      false
    )
    assert.equal(
      verifyOdooWebhookSignature(body, "invalid-hex", secret),
      false
    )
    assert.equal(slugifyHandle("The 3P Fulfilled Snowboard!"), "the-3p-fulfilled-snowboard")
    assert.equal(computeExternalChecksum({ a: 1 }).length, 64)
  })
})

describe("medusa-plugin-odoo — Multi-Protocol OdooClient (JSON-RPC 2.0 & JSON-2)", () => {
  it("authenticates and executes model methods over JSON-RPC 2.0 and JSON-2 APIs", async () => {
    const calls: Array<{ url: string; body: any }> = []

    const mockFetch: typeof fetch = async (input, init) => {
      const url = String(input)
      const body = JSON.parse(String(init?.body || "{}"))
      calls.push({ url, body })

      if (body?.params?.service === "common" && body?.params?.method === "authenticate") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: 7 }), {
          status: 200,
        })
      }

      if (url.includes("/json/2/")) {
        return new Response(JSON.stringify({ result: [{ id: 101, name: "Odoo 19 Product" }] }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          result: [{ id: 100, name: "Odoo 17 Product" }],
        }),
        { status: 200 }
      )
    }

    const jsonRpcClient = new OdooClient(
      {
        url: "https://erp.example.com",
        db: "odoo",
        username: "admin",
        password: "secret",
        protocol: "jsonrpc",
      },
      { fetchImpl: mockFetch }
    )

    const rows1 = await jsonRpcClient.search("product.template", [], ["id", "name"])
    assert.equal(rows1.length, 1)
    assert.equal(rows1[0].id, 100)
    assert.equal(jsonRpcClient.getUid(), 7)

    const json2Client = new OdooClient(
      {
        url: "https://erp.example.com",
        db: "odoo",
        username: "admin",
        apiKey: "bearer_key",
        protocol: "json2",
      },
      { fetchImpl: mockFetch }
    )

    const rows2 = await json2Client.search("product.template", [], ["id", "name"])
    assert.equal(rows2.length, 1)
    assert.equal(rows2[0].id, 101)
    assert.ok(calls.some((c) => c.url.endsWith("/json/2/product.template/search_read")))
  })

  it("trips circuit breaker after threshold failures and recovers after reset window", async () => {
    let shouldFail = true
    const mockFetch: typeof fetch = async () => {
      if (shouldFail) {
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { message: "Access Denied" },
          }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify({ jsonrpc: "2.0", result: 1 }), {
        status: 200,
      })
    }

    const client = new OdooClient(
      {
        url: "https://erp.example.com",
        db: "odoo",
        username: "admin",
        password: "secret",
        circuitThreshold: 2,
        circuitResetMs: 50,
        maxRetries: 0,
      },
      { fetchImpl: mockFetch }
    )

    // Pre-authenticate when healthy
    shouldFail = false
    await client.authenticate()
    shouldFail = true

    await assert.rejects(() => client.search("product.template"))
    assert.equal(client.getCircuitState(), "closed")

    await assert.rejects(() => client.search("product.template"))
    assert.equal(client.getCircuitState(), "open")

    await assert.rejects(
      () => client.search("product.template"),
      /Circuit breaker is OPEN/
    )

    await new Promise((r) => setTimeout(r, 60))
    assert.equal(client.getCircuitState(), "half-open")

    shouldFail = false
    await client.search("product.template")
    assert.equal(client.getCircuitState(), "closed")
  })
})

describe("medusa-plugin-odoo — OdooModuleService End-to-End ERP Flows", () => {
  it("syncs products two-way, reconciles inventory drift, syncs orders with invoices, resolves barcodes, replays POS transactions, and processes webhooks", async () => {
    odooMetrics.reset()

    const mockFetch: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body || "{}"))
      const params = body?.params ?? {}

      if (params.service === "common" && params.method === "authenticate") {
        return new Response(JSON.stringify({ result: 10 }), { status: 200 })
      }
      if (params.service === "common" && params.method === "version") {
        return new Response(
          JSON.stringify({ result: { server_version: "18.0" } }),
          { status: 200 }
        )
      }

      const [ , , , model, method, args ] = params.args ?? []

      if (model === "res.users" && method === "check_access_rights") {
        return new Response(JSON.stringify({ result: true }), { status: 200 })
      }
      if (model === "product.template" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 501,
                name: "Snowboard Pro",
                description_sale: "All-mountain board",
                default_code: "SB-PRO-1",
                barcode: "4006381333931",
                list_price: 499,
                categ_id: [1, "All / Sporting"],
                product_variant_ids: [601],
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (model === "product.product" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 601,
                name: "Snowboard Pro",
                product_tmpl_id: [501, "Snowboard Pro"],
                default_code: "SB-PRO-1",
                barcode: "4006381333931",
                lst_price: 499,
                qty_available: 25,
                virtual_available: 22,
                uom_id: [1, "Units"],
                display_name: "Snowboard Pro",
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (model === "stock.quant" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 701,
                product_id: [601, "Snowboard Pro"],
                location_id: [8, "WH/Stock"],
                quantity: 25,
                reserved_quantity: 3,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (model === "sale.order" && method === "search_read") {
        return new Response(JSON.stringify({ result: [] }), { status: 200 })
      }
      if (model === "res.partner" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 801,
                name: "Jane Doe",
                email: "jane@example.com",
                phone: "+15550100",
                customer_rank: 1,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (method === "create") {
        return new Response(JSON.stringify({ result: 901 }), { status: 200 })
      }
      if (method === "write" || method === "action_confirm" || method === "action_post" || method === "action_create_payments" || method === "action_apply_inventory") {
        return new Response(JSON.stringify({ result: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ result: [] }), { status: 200 })
    }

    const service = new InMemoryOdooService()
    await service.setCustomFetch(mockFetch)

    await service.saveConnectionConfig({
      url: "https://erp.example.com",
      db: "odoo_prod",
      username: "admin@example.com",
      apiKey: "secret_api_key",
      protocol: "jsonrpc",
      webhookSecret: "whsec_odoo_test",
    })

    // 1. Verify connection & status overview
    const verifyRes = await service.verifyConnection()
    assert.equal(verifyRes.ok, true)
    assert.equal(verifyRes.serverVersion, "18.0")

    // 2. Import products from Odoo → Medusa
    const importProdRes = await service.importProductsFromOdoo()
    assert.equal(importProdRes.ok, true)
    assert.equal(importProdRes.created, 1)
    assert.equal(await service.getMedusaId("product", 501), "prod_odoo_501")

    // 3. Export products from Medusa → Odoo (skips products with metadata.odoo_id)
    const exportProdRes = await service.exportProductsToOdoo(undefined, [
      {
        id: "prod_imported",
        title: "Imported",
        metadata: { odoo_id: 501 },
      },
      {
        id: "prod_native_1",
        title: "Medusa Hoodie",
        sku: "HOODIE-01",
        price: 79,
      },
    ])
    assert.equal(exportProdRes.ok, true)
    assert.equal(exportProdRes.skipped, 1)
    assert.equal(exportProdRes.created + exportProdRes.updated, 1)

    // 4. Reconcile inventory drift (odoo_wins & manual_conflict)
    let updatedMedusaQty = 0
    const recRes = await service.reconcileInventory({
      variants: [
        {
          variantId: "var_1",
          sku: "SB-PRO-1",
          medusaQty: 10,
        },
      ],
      strategyOverride: "odoo_wins",
      driftThresholdOverride: 0,
      onUpdateMedusaStock: async (_vid, qty) => {
        updatedMedusaQty = qty
      },
    })
    assert.equal(recRes.ok, true)
    assert.equal(recRes.drifted, 1)
    assert.equal(recRes.fixed, 1)
    assert.equal(updatedMedusaQty, 25)

    const conflictRecRes = await service.reconcileInventory({
      variants: [
        {
          variantId: "var_1",
          sku: "SB-PRO-1",
          medusaQty: 12,
        },
      ],
      strategyOverride: "manual_conflict",
    })
    assert.equal(conflictRecRes.conflicts, 1)
    const openConflicts = await service.listErpConflictResolutions({
      status: "open",
    })
    assert.equal(openConflicts.length, 1)
    await service.resolveConflict({
      id: openConflicts[0].id,
      resolution: "odoo_wins",
    })

    // 5. Sync Order + Invoice + Payment to Odoo
    await service.saveSectionSettings("orders", {
      orderSync: true,
      exportInvoice: true,
      invoiceMode: "paid",
      createPayment: true,
    })

    const orderRes = await service.syncOrderToOdoo({
      order: {
        id: "order_1001",
        email: "jane@example.com",
        payment_status: "captured",
        fulfillment_status: "fulfilled",
        customer: {
          id: "cus_1",
          first_name: "Jane",
          last_name: "Doe",
          email: "jane@example.com",
        },
        items: [
          {
            title: "Snowboard Pro",
            quantity: 2,
            unit_price: 499,
            variant_sku: "SB-PRO-1",
          },
        ],
      },
    })
    assert.equal(orderRes.ok, true)
    assert.equal(orderRes.odooOrderId, 901)
    assert.equal(orderRes.odooInvoiceId, 901)

    // Second call for same order is idempotent
    const duplicateOrderRes = await service.syncOrderToOdoo({
      order: {
        id: "order_1001",
        email: "jane@example.com",
        items: [],
      },
    })
    assert.equal(duplicateOrderRes.skipped, true)

    // 6. Barcode resolution (warehouse & cached)
    const barcodeRes1 = await service.resolveBarcode({
      barcode: "4006381333931",
      context: "warehouse",
    })
    assert.equal(barcodeRes1.found, true)
    assert.equal(barcodeRes1.source, "odoo_db")
    assert.equal(barcodeRes1.availableQty, 22)

    const barcodeRes2 = await service.resolveBarcode({
      barcode: "4006381333931",
      context: "warehouse",
    })
    assert.equal(barcodeRes2.source, "memory_cache")

    // 7. Offline POS transaction enqueue & replay
    const posTxn = await service.enqueueOfflinePosTransaction({
      externalTransactionId: "POS-TX-99",
      customerEmail: "jane@example.com",
      totalCents: 49900,
      items: [
        {
          variantId: "var_1",
          sku: "SB-PRO-1",
          title: "Snowboard Pro",
          quantity: 1,
          unitPriceCents: 49900,
        },
      ],
    })
    const replayRes = await service.replayOfflinePosTransaction({
      id: posTxn.id,
      syncToOdoo: true,
    })
    assert.equal(replayRes.ok, true)
    assert.equal(replayRes.odooOrderId, 901)

    // 8. Inbound webhook processing with HMAC verification & idempotency
    const whPayload = {
      event_id: "evt_001",
      event: "stock.updated",
      model: "stock.quant",
      record_id: 701,
      data: { id: 701, barcode: "4006381333931" },
    }
    const rawBody = JSON.stringify(whPayload)
    const validSig = crypto
      .createHmac("sha256", "whsec_odoo_test")
      .update(rawBody)
      .digest("hex")

    const whRes1 = await service.processWebhookEvent({
      rawBody,
      signatureHeader: validSig,
      payload: whPayload,
    })
    assert.equal(whRes1.ok, true)
    assert.equal(whRes1.duplicate, false)
    assert.equal(whRes1.actionTaken, "queued_inventory_sync")

    const whRes2 = await service.processWebhookEvent({
      rawBody,
      signatureHeader: validSig,
      payload: whPayload,
    })
    assert.equal(whRes2.duplicate, true)

    // 9. Prometheus metrics output
    const promText = await service.getPrometheusMetrics()
    assert.ok(promText.includes("odoo_sync_runs_total"))
    assert.ok(promText.includes("odoo_barcode_lookups_total"))
  })
})

describe("medusa-plugin-odoo — Typed Client SDK & Query Keys", () => {
  it("constructs query keys and executes SDK requests cleanly", async () => {
    assert.equal(
      matchesOdooQueryKeyPrefix(
        odooQueryKeys.section("product"),
        odooQueryKeys.all
      ),
      true
    )

    const sdk = createOdooSdk({
      baseUrl: "https://medusa.example.com",
      fetchImpl: async (input) => {
        const url = String(input)
        if (url.endsWith("/admin/odoo/status")) {
          return new Response(
            JSON.stringify({
              status: "connected",
              protocol: "jsonrpc",
              circuitState: "closed",
              totalMappings: 5,
              openFailures: 0,
              openConflicts: 0,
              pendingPosTransactions: 0,
              recentLogsCount: 2,
              timestamp: new Date().toISOString(),
            }),
            { status: 200 }
          )
        }
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
        })
      },
    })

    const status = await sdk.admin.getStatus()
    assert.equal(status.status, "connected")
    assert.equal(status.totalMappings, 5)
  })
})

describe("medusa-plugin-odoo — API Validators & Middlewares", () => {
  it("validates payloads via dedicated src/api/validators.ts schemas and re-exports from middlewares", () => {
    assert.strictEqual(OdooConfigSchema, ReExportedOdooConfigSchema)
    assert.ok(Array.isArray(middlewares.routes))
    assert.ok(middlewares.routes.length > 0)

    const validConfig = OdooConfigSchema.parse({
      url: "https://erp.example.com",
      db: "odoo_prod",
      username: "admin@example.com",
      protocol: "json2",
    })
    assert.equal(validConfig.protocol, "json2")

    const validSync = OdooTriggerSyncSchema.parse({
      direction: "odoo_to_medusa",
      strategy: "odoo_wins",
    })
    assert.equal(validSync.direction, "odoo_to_medusa")

    const validBarcode = OdooBarcodeLookupSchema.parse({
      barcode: "4006381333931",
      context: "pos",
    })
    assert.equal(validBarcode.context, "pos")
  })
})

describe("medusa-plugin-odoo — Admin UI Localization (10 Locales Key Parity)", () => {
  it("exports all 10 locales (ar, de, en, es, fr, it, nl, pl, pt, tr) with 100% key parity", () => {
    const bundles = adminI18n
    const locales = SUPPORTED_UI_LOCALES.map((l) => l.code)

    assert.equal(locales.length, 10)

    const flattenKeys = (
      obj: Record<string, unknown>,
      prefix = ""
    ): string[] =>
      Object.entries(obj).flatMap(([k, v]) => {
        const nextKey = prefix ? `${prefix}.${k}` : k
        if (v && typeof v === "object" && !Array.isArray(v)) {
          return flattenKeys(v as Record<string, unknown>, nextKey)
        }
        return [nextKey]
      })

    const enKeys = flattenKeys(
      bundles.en.translation as unknown as Record<string, unknown>
    ).sort()
    assert.ok(enKeys.length >= 100)

    for (const localeCode of locales) {
      const entry = bundles[localeCode]
      assert.ok(entry, `Missing locale bundle for ${localeCode}`)
      assert.strictEqual(entry.translation, entry.odoo)
      const localeKeys = flattenKeys(
        entry.translation as unknown as Record<string, unknown>
      ).sort()
      assert.deepEqual(
        localeKeys,
        enKeys,
        `Locale "${localeCode}" keys do not match "en"`
      )
    }
  })

  it("configures Odoo Admin route and sub-routes with localized label, translationNs, and breadcrumbs", async () => {
    const routeMod = await import("../admin/routes/odoo/page")
    assert.equal(routeMod.config.label, "nav.label")
    assert.equal(
      (routeMod.config as Record<string, unknown>).translationNs,
      "odoo"
    )
    assert.equal(typeof routeMod.handle?.breadcrumb, "function")
    assert.equal(typeof routeMod.default, "function")

    const subRoutes = [
      {
        mod: await import("../admin/routes/odoo/connection/page"),
        label: "tabs.connection",
      },
      {
        mod: await import("../admin/routes/odoo/settings/page"),
        label: "tabs.settings",
      },
      {
        mod: await import("../admin/routes/odoo/logs/page"),
        label: "tabs.logs",
      },
      {
        mod: await import("../admin/routes/odoo/barcode/page"),
        label: "tabs.barcode",
      },
    ]

    for (const sub of subRoutes) {
      assert.equal(sub.mod.config.label, sub.label)
      assert.equal(
        (sub.mod.config as Record<string, unknown>).translationNs,
        "odoo"
      )
      assert.equal(typeof sub.mod.handle?.breadcrumb, "function")
      assert.equal(typeof sub.mod.default, "function")
    }

    const orderWidget = await import("../admin/widgets/order-odoo-widget")
    assert.equal(orderWidget.config.zone, "order.details.after")
    assert.equal(typeof orderWidget.default, "function")

    const productWidget = await import("../admin/widgets/product-odoo-widget")
    assert.equal(productWidget.config.zone, "product.details.after")
    assert.equal(typeof productWidget.default, "function")
  })
})

describe("medusa-plugin-odoo — Auto-Discovery, Lifecycle & POS Enhancements", () => {
  it("exports OdooSyncService alias alongside OdooModuleService", async () => {
    const rootMod = await import("../index")
    const odooSyncMod = await import("../modules/odoo-sync")
    assert.strictEqual(rootMod.OdooSyncService, OdooModuleService)
    assert.strictEqual(odooSyncMod.OdooSyncService, OdooModuleService)
  })

  it("auto-discovers variants in reconcileInventory, auto-queries customers/inventory, resolves POS barcodes via query.graph, applies conflict stock, and handles order cancellation & product archiving", async () => {
    const odooCalls: Array<{ model: string; method: string; args: any[] }> = []

    const mockFetch: typeof fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body || "{}"))
      const params = body?.params ?? {}
      if (params.service === "common" && params.method === "authenticate") {
        return new Response(JSON.stringify({ result: 11 }), { status: 200 })
      }
      const [, , , model, method, args] = params.args ?? []
      if (model && method) {
        odooCalls.push({ model, method, args })
      }
      if (model === "product.product" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 601,
                name: "Snowboard Pro",
                product_tmpl_id: [501, "Snowboard Pro"],
                default_code: "SB-PRO-1",
                barcode: "4006381333931",
                lst_price: 499,
                qty_available: 30,
                virtual_available: 28,
                uom_id: [1, "Units"],
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (model === "stock.quant" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 701,
                product_id: [601, "Snowboard Pro"],
                location_id: [8, "WH/Stock"],
                quantity: 30,
                reserved_quantity: 2,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (model === "res.partner" && method === "search_read") {
        return new Response(
          JSON.stringify({
            result: [
              {
                id: 801,
                name: "Alice Wonder",
                email: "alice@example.com",
                phone: "+15550199",
                customer_rank: 1,
              },
            ],
          }),
          { status: 200 }
        )
      }
      if (method === "create") {
        return new Response(JSON.stringify({ result: 950 }), { status: 200 })
      }
      if (method === "search_read") {
        return new Response(JSON.stringify({ result: [] }), { status: 200 })
      }
      return new Response(JSON.stringify({ result: true }), { status: 200 })
    }

    const updatedInventoryLevels: Array<Record<string, unknown>> = []
    const createdCustomers: Array<Record<string, unknown>> = []

    const mockScope = {
      resolve: (key: string) => {
        if (key === "query") {
          return {
            graph: async ({ entity, filters }: Record<string, any>) => {
              if (entity === "product_variant") {
                if (filters?.barcode && filters.barcode !== "4006381333931") {
                  return { data: [] }
                }
                return {
                  data: [
                    {
                      id: "var_auto_1",
                      title: "158cm",
                      sku: "SB-PRO-1",
                      barcode: "4006381333931",
                      product_id: "prod_auto_1",
                      product: {
                        id: "prod_auto_1",
                        title: "Snowboard Pro",
                        thumbnail: "https://example.com/sb.png",
                      },
                      prices: [{ amount: 49900 }],
                      inventory_items: [
                        {
                          inventory_item_id: "iitem_1",
                          inventory: {
                            id: "iitem_1",
                            location_levels: [
                              {
                                id: "loclvl_1",
                                location_id: "sloc_1",
                                stocked_quantity: 12,
                              },
                            ],
                          },
                        },
                      ],
                    },
                  ],
                }
              }
              if (entity === "inventory_item") {
                return {
                  data: [
                    {
                      id: "iitem_1",
                      sku: "SB-PRO-1",
                      location_levels: [
                        {
                          id: "loclvl_1",
                          location_id: "sloc_1",
                          stocked_quantity: 18,
                        },
                      ],
                    },
                  ],
                }
              }
              if (entity === "customer") {
                return {
                  data: [
                    {
                      id: "cus_med_1",
                      email: "bob@example.com",
                      first_name: "Bob",
                      last_name: "Builder",
                      phone: "+15550200",
                      company_name: "BuildIt",
                      addresses: [
                        {
                          address_1: "123 Main St",
                          city: "Austin",
                          postal_code: "78701",
                        },
                      ],
                    },
                  ],
                }
              }
              return { data: [] }
            },
          }
        }
        if (key === "inventory") {
          return {
            updateInventoryLevels: async (levels: Array<Record<string, unknown>>) => {
              updatedInventoryLevels.push(...levels)
              return levels
            },
            listInventoryItems: async () => [{ id: "iitem_1", sku: "SB-PRO-1" }],
            listInventoryLevels: async () => [
              {
                id: "loclvl_1",
                inventory_item_id: "iitem_1",
                location_id: "sloc_1",
                stocked_quantity: 12,
              },
            ],
          }
        }
        if (key === "customer") {
          return {
            listCustomers: async () => [],
            createCustomers: async (data: Record<string, unknown>) => {
              const row = { id: "cus_created_from_odoo", ...data }
              createdCustomers.push(row)
              return row
            },
            updateCustomers: async () => ({}),
          }
        }
        return null
      },
    }

    const service = new InMemoryOdooService()
    await service.setCustomFetch(mockFetch)
    await service.saveConnectionConfig({
      url: "https://erp.example.com",
      db: "odoo_prod",
      username: "admin@example.com",
      apiKey: "secret_api_key",
      protocol: "jsonrpc",
    })

    // 1. Auto-discovered reconcileInventory updates Medusa inventory automatically
    const recRes = await service.reconcileInventory({
      scope: mockScope,
      strategyOverride: "odoo_wins",
      driftThresholdOverride: 0,
    })
    assert.equal(recRes.ok, true)
    assert.equal(recRes.checked, 1)
    assert.equal(recRes.drifted, 1)
    assert.equal(recRes.fixed, 1)
    assert.equal(updatedInventoryLevels.length, 1)
    assert.equal(updatedInventoryLevels[0].stocked_quantity, 30)

    // Verify sync_version increments on repeated upsertMapping
    const mapping1 = await service.upsertMapping({
      entityType: "variant",
      medusaId: "var_auto_1",
      odooId: 601,
      direction: "bidirectional",
    })
    assert.ok(Number(mapping1.sync_version) >= 2)

    // 2. Auto-queried exportInventoryToOdoo
    const expInvRes = await service.exportInventoryToOdoo(
      mockScope,
      undefined,
      "manual"
    )
    assert.equal(expInvRes.ok, true)
    assert.equal(expInvRes.updated, 1)

    // 3. Auto-queried & auto-upserted syncCustomers (with address fields)
    const custRes = await service.syncCustomers({
      scope: mockScope,
      directionOverride: "bidirectional",
    })
    assert.equal(custRes.ok, true)
    assert.equal(createdCustomers.length, 1)
    assert.equal(createdCustomers[0].email, "alice@example.com")
    assert.ok(
      odooCalls.some(
        (c) =>
          c.model === "res.partner" &&
          (c.method === "create" || c.method === "write") &&
          JSON.stringify(c.args).includes("123 Main St")
      )
    )

    // 4. POS barcode resolution via default Medusa query.graph lookup + device/session fields
    const posScan = await service.resolveBarcode({
      barcode: "4006381333931",
      context: "pos",
      scope: mockScope,
      deviceId: "pos-term-01",
      sessionId: "sess-100",
      operatorId: "op-7",
    })
    assert.equal(posScan.found, true)
    assert.equal(posScan.source, "medusa_db")
    assert.equal(posScan.variantId, "var_auto_1")
    assert.equal(posScan.unitPriceCents, 49900)
    assert.equal(posScan.deviceId, "pos-term-01")
    const scanLogs = await service.listBarcodeScanLogs()
    assert.equal(scanLogs[0].device_id, "pos-term-01")
    assert.equal(scanLogs[0].session_id, "sess-100")
    assert.equal(scanLogs[0].operator_id, "op-7")

    // 5. Offline POS enqueue with device/session/location/cart/payment metadata
    const posTxn = await service.enqueueOfflinePosTransaction({
      externalTransactionId: "POS-ENH-1",
      deviceId: "pos-term-01",
      sessionId: "sess-100",
      posLocationId: "loc-downtown",
      cartId: "cart_99",
      paymentMethod: "card_present",
      totalCents: 49900,
      items: [
        {
          variantId: "var_auto_1",
          sku: "SB-PRO-1",
          quantity: 1,
          unitPriceCents: 49900,
        },
      ],
    })
    assert.equal(posTxn.device_id, "pos-term-01")
    assert.equal(posTxn.pos_location_id, "loc-downtown")
    assert.equal(posTxn.payment_method, "card_present")

    // 6. Conflict resolution applies winning stock value to Odoo & Medusa
    const conflictRec = await service.reconcileInventory({
      scope: mockScope,
      strategyOverride: "manual_conflict",
      driftThresholdOverride: 0,
    })
    assert.equal(conflictRec.conflicts, 1)
    const conflicts = await service.listErpConflictResolutions({ status: "open" })
    await service.resolveConflict({
      id: conflicts[0].id,
      resolution: "custom",
      customValue: 45,
      scope: mockScope,
    })
    assert.equal(
      updatedInventoryLevels[updatedInventoryLevels.length - 1].stocked_quantity,
      45
    )

    // 7. Order cancellation & product archiving lifecycle
    await service.upsertMapping({
      entityType: "order",
      medusaId: "order_cancel_1",
      odooId: 777,
      direction: "medusa_to_odoo",
    })
    const cancelRes = await service.cancelOrderInOdoo("order_cancel_1")
    assert.equal(cancelRes.ok, true)
    assert.equal(cancelRes.odooOrderId, 777)
    assert.ok(
      odooCalls.some(
        (c) => c.model === "sale.order" && c.method === "action_cancel"
      )
    )

    await service.upsertMapping({
      entityType: "product",
      medusaId: "prod_del_1",
      odooId: 501,
      direction: "medusa_to_odoo",
    })
    const archiveRes = await service.archiveProductInOdoo("prod_del_1")
    assert.equal(archiveRes.ok, true)
    assert.equal(archiveRes.odooProductId, 501)
    assert.ok(
      odooCalls.some(
        (c) =>
          c.model === "product.template" &&
          c.method === "write" &&
          JSON.stringify(c.args).includes('"active":false')
      )
    )
  })

  it("wires order.canceled, product.deleted, customer.updated subscribers, jobs, and route handlers", async () => {
    const orderSub = await import("../subscribers/order-placed")
    const productSub = await import("../subscribers/product-updated")
    const customerSub = await import("../subscribers/customer-updated")
    const recJob = await import("../jobs/odoo-reconciliation")
    const syncJob = await import("../jobs/odoo-scheduled-sync")
    const barcodeRoute = await import("../api/store/odoo/barcode/route")
    const conflictsRoute = await import("../api/admin/odoo/conflicts/route")
    const syncEntityRoute = await import("../api/admin/odoo/sync/[entity]/route")
    const posRoute = await import("../api/admin/odoo/pos-transactions/route")
    const webhookRoute = await import("../api/hooks/odoo/route")

    assert.deepEqual(orderSub.config.event, ["order.placed", "order.canceled"])
    assert.deepEqual(productSub.config.event, [
      "product.created",
      "product.updated",
      "product.deleted",
    ])
    assert.deepEqual(customerSub.config.event, [
      "customer.created",
      "customer.updated",
    ])
    assert.equal(typeof recJob.default, "function")
    assert.equal(typeof syncJob.default, "function")
    assert.equal(typeof barcodeRoute.POST, "function")
    assert.equal(typeof conflictsRoute.POST, "function")
    assert.equal(typeof syncEntityRoute.POST, "function")
    assert.equal(typeof posRoute.POST, "function")
    assert.equal(typeof webhookRoute.POST, "function")
  })
})



