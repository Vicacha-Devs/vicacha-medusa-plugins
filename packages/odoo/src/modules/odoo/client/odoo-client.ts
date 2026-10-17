import { MedusaError } from "@medusajs/framework/utils"
import type {
  OdooCategoryRecord,
  OdooCircuitState,
  OdooCompanyRecord,
  OdooConnectionConfig,
  OdooDetailedProduct,
  OdooInventoryQuantityType,
  OdooJournalRecord,
  OdooPartnerRecord,
  OdooProductVariantData,
  OdooProtocolVersion,
  OdooSaleOrderLineInput,
  OdooSaleOrderRecord,
  OdooStockQuantRecord,
  OdooWarehouseRecord,
} from "../types"
import { odooMetrics } from "../utils/metrics"
import { validateSafeOdooUrl } from "../utils/security"

export type FetchLike = typeof fetch

export class OdooClient {
  public readonly url: string
  public readonly db: string
  public readonly username: string
  public readonly protocol: OdooProtocolVersion
  public readonly companyId: number | null
  private readonly secret: string
  private readonly timeoutMs: number
  private readonly maxRetries: number
  private readonly rateLimitPerSec: number
  private readonly circuitThreshold: number
  private readonly circuitResetMs: number
  private readonly fetchImpl: FetchLike

  private uid: number | null = null
  private rpcId = 1
  private requestCount = 0
  private windowStart = Date.now()
  private circuitState: OdooCircuitState = "closed"
  private failureCount = 0
  private lastFailureTime = 0

  constructor(
    config: OdooConnectionConfig,
    options?: { fetchImpl?: FetchLike }
  ) {
    this.url = validateSafeOdooUrl(config.url, {
      allowPrivateNetwork: config.allowPrivateNetwork ?? false,
    })
    this.db = config.db.trim()
    this.username = config.username.trim()
    this.secret = (config.apiKey || config.password || "").trim()
    this.protocol = config.protocol ?? "jsonrpc"
    this.companyId = config.companyId ?? null
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.maxRetries = config.maxRetries ?? 3
    this.rateLimitPerSec = config.rateLimitPerSec ?? 20
    this.circuitThreshold = config.circuitThreshold ?? 5
    this.circuitResetMs = config.circuitResetMs ?? 60_000
    this.fetchImpl = options?.fetchImpl ?? globalThis.fetch
  }

  getCircuitState(): OdooCircuitState {
    if (this.circuitState === "open") {
      const elapsed = Date.now() - this.lastFailureTime
      if (elapsed >= this.circuitResetMs) {
        this.circuitState = "half-open"
        odooMetrics.setCircuitState("half-open")
      }
    }
    return this.circuitState
  }

  getUid(): number | null {
    return this.uid
  }

  private async throttle(): Promise<void> {
    if (this.rateLimitPerSec <= 0) return
    const now = Date.now()
    if (now - this.windowStart >= 1_000) {
      this.requestCount = 0
      this.windowStart = now
    }
    if (this.requestCount >= this.rateLimitPerSec) {
      const waitMs = Math.max(1, 1_000 - (now - this.windowStart))
      await new Promise((resolve) => setTimeout(resolve, waitMs))
      this.requestCount = 0
      this.windowStart = Date.now()
    }
    this.requestCount++
  }

  private checkCircuit(): void {
    const state = this.getCircuitState()
    if (state === "open") {
      const elapsed = Date.now() - this.lastFailureTime
      const retryAfterSec = Math.max(
        1,
        Math.ceil((this.circuitResetMs - elapsed) / 1000)
      )
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[OdooClient] Circuit breaker is OPEN. Retry after ${retryAfterSec}s.`
      )
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0
    this.circuitState = "closed"
    odooMetrics.setCircuitState("closed")
  }

  private recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    if (this.failureCount >= this.circuitThreshold) {
      this.circuitState = "open"
      odooMetrics.setCircuitState("open")
    }
  }

  private async postJson<TResult = unknown>(
    endpointPath: string,
    body: Record<string, unknown>,
    extraHeaders?: Record<string, string>
  ): Promise<TResult> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const response = await this.fetchImpl(`${this.url}${endpointPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(extraHeaders ?? {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `[OdooClient] HTTP ${response.status}: ${response.statusText}`
        )
      }

      const json = (await response.json()) as {
        result?: TResult
        error?: {
          message?: string
          data?: { message?: string; debug?: string }
        }
      }

      if (json && typeof json === "object" && "error" in json && json.error) {
        const msg =
          json.error.data?.message ?? json.error.message ?? "Unknown RPC error"
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          `[OdooClient] Odoo RPC error: ${msg}`
        )
      }

      if (json && typeof json === "object" && "result" in json) {
        return json.result as TResult
      }

      return json as unknown as TResult
    } finally {
      clearTimeout(timer)
    }
  }

  async authenticate(): Promise<number> {
    if (this.protocol === "json2") {
      // Odoo 19+ JSON-2 API uses Bearer API key authentication; verify via common version or user read
      const body = {
        jsonrpc: "2.0",
        method: "call",
        id: this.rpcId++,
        params: {
          service: "common",
          method: "authenticate",
          args: [this.db, this.username, this.secret, {}],
        },
      }
      const uid = await this.postJson<number | false>("/jsonrpc", body, {
        Authorization: `Bearer ${this.secret}`,
        "X-Odoo-Database": this.db,
      })
      if (!uid || typeof uid !== "number") {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          `[OdooClient] Authentication failed for user "${this.username}" on db "${this.db}"`
        )
      }
      this.uid = uid
      return uid
    }

    const body = {
      jsonrpc: "2.0",
      method: "call",
      id: this.rpcId++,
      params: {
        service: "common",
        method: "authenticate",
        args: [this.db, this.username, this.secret, {}],
      },
    }

    const uid = await this.postJson<number | false>("/jsonrpc", body)
    if (!uid || typeof uid !== "number") {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        `[OdooClient] Authentication failed for user "${this.username}" on db "${this.db}"`
      )
    }
    this.uid = uid
    return uid
  }

  async ensureAuth(): Promise<number> {
    if (this.uid === null) {
      return this.authenticate()
    }
    return this.uid
  }

  async getServerVersion(): Promise<string | null> {
    try {
      const body = {
        jsonrpc: "2.0",
        method: "call",
        id: this.rpcId++,
        params: {
          service: "common",
          method: "version",
          args: [],
        },
      }
      const res = await this.postJson<{ server_version?: string }>(
        "/jsonrpc",
        body
      )
      return res?.server_version ?? null
    } catch {
      return null
    }
  }

  async rpc<TResult = unknown>(
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {}
  ): Promise<TResult> {
    await this.ensureAuth()
    await this.throttle()
    this.checkCircuit()

    const contextKwargs =
      this.companyId && !kwargs.context
        ? {
            ...kwargs,
            context: {
              allowed_company_ids: [this.companyId],
              company_id: this.companyId,
            },
          }
        : kwargs

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        const delayMs = Math.min(2 ** attempt * 200, 5_000)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      try {
        let result: TResult
        if (this.protocol === "json2") {
          result = await this.postJson<TResult>(
            `/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`,
            {
              args,
              kwargs: contextKwargs,
            },
            {
              Authorization: `Bearer ${this.secret}`,
              "X-Odoo-Database": this.db,
            }
          )
        } else {
          const body = {
            jsonrpc: "2.0",
            method: "call",
            id: this.rpcId++,
            params: {
              service: "object",
              method: "execute_kw",
              args: [
                this.db,
                this.uid,
                this.secret,
                model,
                method,
                args,
                contextKwargs,
              ],
            },
          }
          result = await this.postJson<TResult>("/jsonrpc", body)
        }

        this.recordSuccess()
        odooMetrics.recordRpcCall({
          protocol: this.protocol,
          model,
          method,
          status: "success",
        })
        return result
      } catch (err) {
        lastError =
          err instanceof Error
            ? err
            : new MedusaError(MedusaError.Types.UNEXPECTED_STATE, String(err))
        this.recordFailure()
        odooMetrics.recordRpcCall({
          protocol: this.protocol,
          model,
          method,
          status: "error",
        })

        // Do not retry on Odoo application-level errors
        if (lastError.message.includes("Odoo RPC error")) {
          throw lastError
        }
        this.checkCircuit()
      }
    }

    throw (
      lastError ??
      new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "[OdooClient] Unknown RPC error after retries"
      )
    )
  }

  // ─── Generic CRUD ──────────────────────────────────────────────────────────

  async search<TRecord = Record<string, unknown>>(
    model: string,
    domain: unknown[] = [],
    fields: string[] = [],
    limit = 0,
    offset = 0
  ): Promise<TRecord[]> {
    const kwargs: Record<string, unknown> = {}
    if (fields.length > 0) kwargs.fields = fields
    if (limit > 0) kwargs.limit = limit
    if (offset > 0) kwargs.offset = offset
    return this.rpc<TRecord[]>(model, "search_read", [domain], kwargs)
  }

  async searchIds(
    model: string,
    domain: unknown[] = [],
    limit = 0
  ): Promise<number[]> {
    const kwargs: Record<string, unknown> = {}
    if (limit > 0) kwargs.limit = limit
    return this.rpc<number[]>(model, "search", [domain], kwargs)
  }

  async create(
    model: string,
    vals: Record<string, unknown>
  ): Promise<number> {
    const res = await this.rpc<number | number[]>(model, "create", [[vals]])
    return Array.isArray(res) ? res[0] : res
  }

  async write(
    model: string,
    ids: number[],
    vals: Record<string, unknown>
  ): Promise<boolean> {
    return this.rpc<boolean>(model, "write", [ids, vals])
  }

  async unlink(model: string, ids: number[]): Promise<boolean> {
    return this.rpc<boolean>(model, "unlink", [ids])
  }

  async searchCount(model: string, domain: unknown[] = []): Promise<number> {
    return this.rpc<number>(model, "search_count", [domain])
  }

  // ─── Health & Discovery ────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      await this.rpc("res.users", "check_access_rights", ["read"], {
        raise_exception: false,
      })
      return true
    } catch {
      return false
    }
  }

  async getCompanies(): Promise<OdooCompanyRecord[]> {
    return this.search<OdooCompanyRecord>(
      "res.company",
      [],
      ["id", "name", "currency_id"],
      100
    )
  }

  async getWarehouses(): Promise<OdooWarehouseRecord[]> {
    return this.search<OdooWarehouseRecord>(
      "stock.warehouse",
      [],
      ["id", "name", "code", "lot_stock_id"],
      100
    )
  }

  async getPaymentJournals(): Promise<OdooJournalRecord[]> {
    return this.search<OdooJournalRecord>(
      "account.journal",
      [["type", "in", ["bank", "cash"]]],
      ["id", "name", "type", "code"],
      100
    )
  }

  async getProductCategories(): Promise<OdooCategoryRecord[]> {
    return this.search<OdooCategoryRecord>(
      "product.category",
      [],
      ["id", "name", "complete_name"],
      500
    )
  }

  // ─── Product & Variant Helpers ─────────────────────────────────────────────

  async fetchDetailedProducts(options?: {
    categoryIds?: number[]
    withImages?: boolean
    limit?: number
  }): Promise<OdooDetailedProduct[]> {
    const domain: unknown[] = [["sale_ok", "=", true]]
    if (options?.categoryIds && options.categoryIds.length > 0) {
      domain.push(["categ_id", "child_of", options.categoryIds])
    }

    const templateFields = [
      "id",
      "name",
      "description_sale",
      "default_code",
      "barcode",
      "list_price",
      "categ_id",
      "product_variant_ids",
    ]
    if (options?.withImages) {
      templateFields.push("image_1920")
    }

    const templates = await this.search<Record<string, unknown>>(
      "product.template",
      domain,
      templateFields,
      options?.limit ?? 500
    )

    if (!templates.length) return []

    const allVariantIds: number[] = []
    for (const tmpl of templates) {
      const vIds = Array.isArray(tmpl.product_variant_ids)
        ? (tmpl.product_variant_ids as number[])
        : []
      allVariantIds.push(...vIds)
    }

    const variantRows = allVariantIds.length
      ? await this.search<Record<string, unknown>>(
          "product.product",
          [["id", "in", allVariantIds]],
          [
            "id",
            "product_tmpl_id",
            "default_code",
            "barcode",
            "lst_price",
            "qty_available",
            "virtual_available",
            "product_template_variant_value_ids",
            "display_name",
          ],
          allVariantIds.length
        )
      : []

    const variantsByTemplate = new Map<number, OdooProductVariantData[]>()
    for (const v of variantRows) {
      const tmplRef = v.product_tmpl_id
      const tmplId = Array.isArray(tmplRef)
        ? Number(tmplRef[0])
        : Number(tmplRef)
      const list = variantsByTemplate.get(tmplId) ?? []
      list.push({
        id: Number(v.id),
        sku:
          typeof v.default_code === "string" && v.default_code
            ? v.default_code
            : null,
        barcode:
          typeof v.barcode === "string" && v.barcode ? v.barcode : null,
        price: Number(v.lst_price ?? 0),
        options: {
          Title:
            typeof v.display_name === "string" && v.display_name
              ? v.display_name
              : "Default",
        },
        qtyAvailable: Number(v.qty_available ?? 0),
        virtualAvailable: Number(v.virtual_available ?? 0),
      })
      variantsByTemplate.set(tmplId, list)
    }

    return templates.map((tmpl) => {
      const id = Number(tmpl.id)
      const name = String(tmpl.name ?? `Product ${id}`)
      const categRef = tmpl.categ_id
      const categoryId = Array.isArray(categRef)
        ? Number(categRef[0])
        : typeof categRef === "number"
          ? categRef
          : null
      const categoryName = Array.isArray(categRef)
        ? String(categRef[1] ?? "")
        : null

      const templateVariants = variantsByTemplate.get(id) ?? [
        {
          id,
          sku:
            typeof tmpl.default_code === "string" && tmpl.default_code
              ? tmpl.default_code
              : null,
          barcode:
            typeof tmpl.barcode === "string" && tmpl.barcode
              ? tmpl.barcode
              : null,
          price: Number(tmpl.list_price ?? 0),
          options: { Title: "Default" },
        },
      ]

      const optionValues = Array.from(
        new Set(
          templateVariants.map((v) => v.options.Title || "Default")
        )
      )

      return {
        id,
        name,
        description:
          typeof tmpl.description_sale === "string"
            ? tmpl.description_sale
            : null,
        sku:
          typeof tmpl.default_code === "string" ? tmpl.default_code : null,
        barcode: typeof tmpl.barcode === "string" ? tmpl.barcode : null,
        listPrice: Number(tmpl.list_price ?? 0),
        categoryId,
        categoryName,
        imageBase64:
          typeof tmpl.image_1920 === "string" && tmpl.image_1920
            ? tmpl.image_1920
            : null,
        options: [{ title: "Title", values: optionValues }],
        variants: templateVariants,
      }
    })
  }

  async upsertProduct(
    medusaId: string,
    vals: Record<string, unknown>,
    existingOdooId?: number | null
  ): Promise<{ id: number; created: boolean }> {
    if (existingOdooId) {
      await this.write("product.template", [existingOdooId], vals)
      return { id: existingOdooId, created: false }
    }

    const sku = typeof vals.default_code === "string" ? vals.default_code : null
    if (sku) {
      const existing = await this.search<{ id: number }>(
        "product.template",
        [["default_code", "=", sku]],
        ["id"],
        1
      )
      if (existing.length > 0) {
        const id = existing[0].id
        await this.write("product.template", [id], vals)
        return { id, created: false }
      }
    }

    const id = await this.create("product.template", {
      sale_ok: true,
      type: "consu",
      ...vals,
    })
    return { id, created: true }
  }

  async upsertVariant(
    medusaVariantId: string,
    vals: Record<string, unknown>,
    existingOdooId?: number | null
  ): Promise<{ id: number; created: boolean }> {
    if (existingOdooId) {
      await this.write("product.product", [existingOdooId], vals)
      return { id: existingOdooId, created: false }
    }

    const sku = typeof vals.default_code === "string" ? vals.default_code : null
    if (sku) {
      const existing = await this.search<{ id: number }>(
        "product.product",
        [["default_code", "=", sku]],
        ["id"],
        1
      )
      if (existing.length > 0) {
        const id = existing[0].id
        await this.write("product.product", [id], vals)
        return { id, created: false }
      }
    }

    const id = await this.create("product.product", vals)
    return { id, created: true }
  }

  // ─── Inventory & Warehouse Helpers ─────────────────────────────────────────

  async getStockQuants(locationIds: number[]): Promise<OdooStockQuantRecord[]> {
    return this.search<OdooStockQuantRecord>(
      "stock.quant",
      [["location_id", "in", locationIds]],
      ["id", "product_id", "location_id", "quantity", "reserved_quantity"]
    )
  }

  async updateStockQuantity(
    productId: number,
    locationId: number,
    qty: number
  ): Promise<void> {
    const existing = await this.search<{ id: number }>(
      "stock.quant",
      [
        ["product_id", "=", productId],
        ["location_id", "=", locationId],
      ],
      ["id"],
      1
    )

    let quantId: number
    if (existing.length > 0) {
      quantId = existing[0].id
      await this.write("stock.quant", [quantId], {
        inventory_quantity: qty,
      })
    } else {
      quantId = await this.create("stock.quant", {
        product_id: productId,
        location_id: locationId,
        inventory_quantity: qty,
      })
    }

    await this.rpc("stock.quant", "action_apply_inventory", [[quantId]], {})
  }

  async readWarehouseStockBySkus(params: {
    skus: string[]
    warehouseId: number
    qtyType?: OdooInventoryQuantityType
  }): Promise<Array<{ sku: string; odooProductId: number; qty: number }>> {
    if (!params.skus.length) return []

    const products = await this.search<{
      id: number
      default_code?: string | false
      barcode?: string | false
      qty_available?: number
      virtual_available?: number
    }>(
      "product.product",
      [
        "|",
        ["default_code", "in", params.skus],
        ["barcode", "in", params.skus],
      ],
      [
        "id",
        "default_code",
        "barcode",
        "qty_available",
        "virtual_available",
      ],
      params.skus.length * 2,
      0
    )

    // Attempt to resolve warehouse's internal stock location
    const warehouses = await this.search<OdooWarehouseRecord>(
      "stock.warehouse",
      [["id", "=", params.warehouseId]],
      ["id", "lot_stock_id"],
      1
    )
    const lotStockRef = warehouses[0]?.lot_stock_id
    const locationId = Array.isArray(lotStockRef)
      ? Number(lotStockRef[0])
      : typeof lotStockRef === "number"
        ? lotStockRef
        : null

    const productIds = products.map((p) => p.id)
    const quantByProduct = new Map<
      number,
      { onHand: number; forecasted: number }
    >()

    if (locationId && productIds.length > 0) {
      const quants = await this.search<OdooStockQuantRecord>(
        "stock.quant",
        [
          ["product_id", "in", productIds],
          ["location_id", "child_of", locationId],
        ],
        ["id", "product_id", "quantity", "reserved_quantity"]
      )
      for (const q of quants) {
        const pid = Array.isArray(q.product_id)
          ? Number(q.product_id[0])
          : Number(q.product_id)
        const current = quantByProduct.get(pid) ?? { onHand: 0, forecasted: 0 }
        const onHand = Number(q.quantity ?? 0)
        const reserved = Number(q.reserved_quantity ?? 0)
        current.onHand += onHand
        current.forecasted += onHand - reserved
        quantByProduct.set(pid, current)
      }
    }

    const useForecasted = params.qtyType === "forecasted"
    return products
      .map((p) => {
        const sku =
          (typeof p.default_code === "string" && p.default_code) ||
          (typeof p.barcode === "string" && p.barcode) ||
          ""
        const quant = quantByProduct.get(p.id)
        const fallbackQty = useForecasted
          ? Number(p.virtual_available ?? p.qty_available ?? 0)
          : Number(p.qty_available ?? 0)
        const qty = quant
          ? useForecasted
            ? quant.forecasted
            : quant.onHand
          : fallbackQty

        return {
          sku,
          odooProductId: p.id,
          qty: Math.max(0, Math.round(qty)),
        }
      })
      .filter((x) => Boolean(x.sku))
  }

  async writeWarehouseStockBySkus(params: {
    levels: Array<{ sku: string; qty: number }>
    warehouseId: number
  }): Promise<{ updated: number; failed: number }> {
    if (!params.levels.length) return { updated: 0, failed: 0 }

    const warehouses = await this.search<OdooWarehouseRecord>(
      "stock.warehouse",
      [["id", "=", params.warehouseId]],
      ["id", "lot_stock_id"],
      1
    )
    const lotStockRef = warehouses[0]?.lot_stock_id
    const locationId = Array.isArray(lotStockRef)
      ? Number(lotStockRef[0])
      : typeof lotStockRef === "number"
        ? lotStockRef
        : 8

    const skus = params.levels.map((l) => l.sku)
    const products = await this.search<{
      id: number
      default_code?: string | false
      barcode?: string | false
    }>(
      "product.product",
      ["|", ["default_code", "in", skus], ["barcode", "in", skus]],
      ["id", "default_code", "barcode"],
      skus.length * 2
    )

    const productBySku = new Map<string, number>()
    for (const p of products) {
      if (typeof p.default_code === "string" && p.default_code) {
        productBySku.set(p.default_code, p.id)
      }
      if (typeof p.barcode === "string" && p.barcode) {
        productBySku.set(p.barcode, p.id)
      }
    }

    let updated = 0
    let failed = 0

    for (const lvl of params.levels) {
      const productId = productBySku.get(lvl.sku)
      if (!productId) {
        failed++
        continue
      }
      try {
        await this.updateStockQuantity(productId, locationId, lvl.qty)
        updated++
      } catch {
        failed++
      }
    }

    return { updated, failed }
  }

  // ─── Order, Invoice & Payment Helpers ──────────────────────────────────────

  async getOrderByMedusaId(
    medusaOrderId: string
  ): Promise<OdooSaleOrderRecord | null> {
    const rows = await this.search<OdooSaleOrderRecord>(
      "sale.order",
      [["client_order_ref", "=", medusaOrderId]],
      [
        "id",
        "name",
        "state",
        "partner_id",
        "amount_total",
        "date_order",
        "invoice_ids",
      ],
      1
    )
    return rows[0] ?? null
  }

  async createSaleOrder(
    vals: Record<string, unknown>,
    lines: OdooSaleOrderLineInput[]
  ): Promise<number> {
    const orderId = await this.create("sale.order", vals)
    for (const line of lines) {
      await this.create("sale.order.line", {
        order_id: orderId,
        product_id: line.product_id,
        product_uom_qty: line.product_uom_qty,
        price_unit: line.price_unit,
        name: line.name,
      })
    }
    return orderId
  }

  async confirmSaleOrder(orderId: number): Promise<void> {
    await this.rpc("sale.order", "action_confirm", [[orderId]], {})
  }

  async createAndPostInvoice(params: {
    partnerId: number
    orderId: number
    originName?: string
    lines: OdooSaleOrderLineInput[]
  }): Promise<number> {
    const invoiceLineCommands = params.lines.map((l) => [
      0,
      0,
      {
        product_id: l.product_id,
        quantity: l.product_uom_qty,
        price_unit: l.price_unit,
        name: l.name,
      },
    ])

    const invoiceId = await this.create("account.move", {
      move_type: "out_invoice",
      partner_id: params.partnerId,
      invoice_origin: params.originName ?? `SO-${params.orderId}`,
      invoice_line_ids: invoiceLineCommands,
    })

    await this.rpc("account.move", "action_post", [[invoiceId]], {})
    return invoiceId
  }

  async registerInvoicePayment(params: {
    invoiceId: number
    journalId?: number | null
  }): Promise<number | null> {
    try {
      const wizardVals: Record<string, unknown> = {}
      if (params.journalId) {
        wizardVals.journal_id = params.journalId
      }
      const wizardId = await this.rpc<number>(
        "account.payment.register",
        "create",
        [[wizardVals]],
        {
          context: {
            active_model: "account.move",
            active_ids: [params.invoiceId],
          },
        }
      )
      await this.rpc(
        "account.payment.register",
        "action_create_payments",
        [[wizardId]],
        {
          context: {
            active_model: "account.move",
            active_ids: [params.invoiceId],
          },
        }
      )
      return wizardId
    } catch {
      return null
    }
  }

  // ─── Customer / Partner Helpers ────────────────────────────────────────────

  async getCustomerByEmail(email: string): Promise<OdooPartnerRecord | null> {
    const normalized = email.trim().toLowerCase()
    const rows = await this.search<OdooPartnerRecord>(
      "res.partner",
      [["email", "=ilike", normalized]],
      [
        "id",
        "name",
        "email",
        "phone",
        "street",
        "city",
        "zip",
        "country_id",
        "vat",
        "company_name",
        "customer_rank",
      ],
      1
    )
    return rows[0] ?? null
  }

  async fetchCustomers(limit = 500): Promise<OdooPartnerRecord[]> {
    return this.search<OdooPartnerRecord>(
      "res.partner",
      [
        ["customer_rank", ">", 0],
        ["email", "!=", false],
      ],
      [
        "id",
        "name",
        "email",
        "phone",
        "street",
        "city",
        "zip",
        "country_id",
        "vat",
        "company_name",
        "customer_rank",
      ],
      limit
    )
  }

  async upsertCustomer(
    medusaCustomerId: string,
    vals: Record<string, unknown>,
    existingOdooId?: number | null
  ): Promise<{ id: number; created: boolean }> {
    if (existingOdooId) {
      await this.write("res.partner", [existingOdooId], vals)
      return { id: existingOdooId, created: false }
    }

    const email = typeof vals.email === "string" ? vals.email : null
    if (email) {
      const existing = await this.getCustomerByEmail(email)
      if (existing) {
        await this.write("res.partner", [existing.id], vals)
        return { id: existing.id, created: false }
      }
    }

    const id = await this.create("res.partner", {
      customer_rank: 1,
      ...vals,
    })
    return { id, created: true }
  }

  // ─── Barcode Resolution Helpers ────────────────────────────────────────────

  async findProductByBarcodeOrSku(barcodeOrSku: string): Promise<{
    id: number
    name: string
    sku: string
    uomName?: string
    stockedQty: number
    availableQty: number
  } | null> {
    const code = barcodeOrSku.trim()
    const products = await this.search<{
      id: number
      name: string
      default_code?: string | false
      barcode?: string | false
      uom_id?: [number, string] | false
    }>(
      "product.product",
      ["|", ["barcode", "=", code], ["default_code", "=", code]],
      ["id", "name", "default_code", "barcode", "uom_id"],
      1
    )

    if (!products.length) return null
    const p = products[0]

    const quants = await this.search<OdooStockQuantRecord>(
      "stock.quant",
      [
        ["product_id", "=", p.id],
        ["location_id.usage", "=", "internal"],
      ],
      ["id", "product_id", "location_id", "quantity", "reserved_quantity"]
    )

    const stockedQty = quants.reduce(
      (sum, q) => sum + Number(q.quantity ?? 0),
      0
    )
    const reservedQty = quants.reduce(
      (sum, q) => sum + Number(q.reserved_quantity ?? 0),
      0
    )

    return {
      id: p.id,
      name: p.name,
      sku:
        (typeof p.default_code === "string" && p.default_code) ||
        (typeof p.barcode === "string" && p.barcode) ||
        code,
      uomName: Array.isArray(p.uom_id) ? String(p.uom_id[1]) : undefined,
      stockedQty,
      availableQty: stockedQty - reservedQty,
    }
  }
}
