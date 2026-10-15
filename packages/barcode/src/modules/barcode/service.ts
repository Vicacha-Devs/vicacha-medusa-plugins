import { MedusaError, MedusaService } from "@medusajs/framework/utils"

import {
  BarcodeCache,
  BarcodeCountItem,
  BarcodeCountSession,
  BarcodeLabelTemplate,
  BarcodeModels,
  BarcodeProduct,
  BarcodeTag,
} from "./models"
import {
  createDefaultProviderRegistry,
  ProviderRegistry,
  runProviderLookupChain,
} from "./providers"
import type {
  BarcodeLookupChainResult,
  BarcodeModuleOptions,
  BarcodeScanAction,
  BarcodeSymbology,
  EnrichmentStrategy,
  LabelPresetId,
  LabelPrintItem,
  LabelPrintOutput,
  LabelTemplateSpec,
  NormalizedBarcodeProduct,
  RenderBarcodeSvgOptions,
} from "./types"
import {
  buildGs1DigitalLink,
  generateInternalEan13,
  parseBarcode,
} from "./utils/barcode-parser"
import {
  BUILTIN_LABEL_TEMPLATES,
  renderPrintableLabels,
} from "./utils/label-printer"
import {
  createAuthenticityHmac,
  generateShortScanCode,
  getBarcodeHmacSecret,
  verifyAuthenticityHmac,
} from "./utils/security"
import { renderBarcodeSvg } from "./utils/svg-renderer"

type InjectedDependencies = Record<string, unknown>

export class BarcodeModuleService extends MedusaService(BarcodeModels) {
  protected readonly options_: BarcodeModuleOptions
  protected readonly registry_: ProviderRegistry
  protected readonly hmacSecret_: string

  constructor(
    container: InjectedDependencies = {},
    options: BarcodeModuleOptions = {}
  ) {
    super(container, options)
    this.options_ = {
      cacheEnabled: true,
      cacheTtlSeconds: 86400,
      enrichmentStrategy: "first-hit",
      autoGenerateVariantBarcode: true,
      internalBarcodePrefix: "200",
      defaultProductStatus: "draft",
      downloadProductImages: false,
      requestTimeoutMs: 5000,
      storefrontBaseUrl:
        process.env.STOREFRONT_URL ||
        process.env.MEDUSA_STOREFRONT_URL ||
        "https://store.example.com",
      ...options,
    }
    this.registry_ = createDefaultProviderRegistry(this.options_)
    this.hmacSecret_ = getBarcodeHmacSecret(this.options_.hmacSecret)
  }

  async getModuleOptions(): Promise<BarcodeModuleOptions> {
    return this.options_
  }

  async getProviderRegistry(): Promise<ProviderRegistry> {
    return this.registry_
  }

  async parseAndValidateBarcode(rawBarcode: string) {
    if (!rawBarcode || !String(rawBarcode).trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Barcode value is required"
      )
    }
    return parseBarcode(rawBarcode)
  }

  /**
   * Looks up a barcode across the configured provider chain with caching.
   */
  async lookupBarcode(
    rawBarcode: string,
    lookupOptions: {
      skipCache?: boolean
      strategy?: EnrichmentStrategy
      providers?: string[]
    } = {}
  ): Promise<BarcodeLookupChainResult> {
    const parsed = await this.parseAndValidateBarcode(rawBarcode)
    const strategy =
      lookupOptions.strategy ||
      this.options_.enrichmentStrategy ||
      "first-hit"

    const useCache =
      this.options_.cacheEnabled !== false && !lookupOptions.skipCache

    if (useCache) {
      try {
        const cachedRows = await this.listBarcodeCaches(
          { barcode: parsed.normalized },
          { take: 1 }
        )
        const cached = cachedRows[0]
        if (cached && cached.expires_at) {
          const expiresAt = new Date(cached.expires_at)
          if (expiresAt.getTime() > Date.now()) {
            const nextHits = Number(cached.hit_count || 0) + 1
            await this.updateBarcodeCaches({
              id: cached.id,
              hit_count: nextHits,
            })

            const cachedProduct = cached.found
              ? (cached.response_data as unknown as NormalizedBarcodeProduct)
              : null

            return {
              barcode: parsed.normalized,
              parsed,
              found: Boolean(cached.found && cachedProduct),
              cached: true,
              strategy,
              product: cachedProduct,
              outcomes: [
                {
                  provider: cached.provider || "cache",
                  found: Boolean(cached.found && cachedProduct),
                  durationMs: 0,
                  product: cachedProduct,
                },
              ],
            }
          }
        }
      } catch {
        // Fallback to live lookup if cache query fails
      }
    }

    const result = await runProviderLookupChain(
      parsed.normalized,
      this.registry_,
      {
        strategy,
        preferredProviders: lookupOptions.providers,
      }
    )

    if (this.options_.cacheEnabled !== false) {
      const ttlSeconds = this.options_.cacheTtlSeconds ?? 86400
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000)
      try {
        const existing = await this.listBarcodeCaches(
          { barcode: parsed.normalized },
          { take: 1 }
        )
        const payload = {
          barcode: parsed.normalized,
          barcode_type: parsed.type,
          provider:
            result.product?.provider ||
            result.outcomes.map((o) => o.provider).join(",") ||
            "none",
          found: result.found,
          response_data: (result.product || {}) as unknown as Record<
            string,
            unknown
          >,
          expires_at: expiresAt,
          hit_count: existing[0] ? Number(existing[0].hit_count || 0) + 1 : 1,
        }

        if (existing[0]) {
          await this.updateBarcodeCaches({
            id: existing[0].id,
            ...payload,
          })
        } else {
          await this.createBarcodeCaches(payload)
        }
      } catch {
        // Non-fatal cache write failure
      }
    }

    return result
  }

  /**
   * Creates or updates a `BarcodeProduct` mapping between a GTIN/barcode and a Medusa Product/Variant.
   */
  async upsertBarcodeProductLink(input: {
    barcode: string
    product_id: string
    variant_id?: string | null
    provider: string
    product_data: NormalizedBarcodeProduct
    status?: "created" | "linked" | "updated"
  }) {
    const parsed = parseBarcode(input.barcode)
    const existing = await this.listBarcodeProducts(
      { barcode: parsed.normalized },
      { take: 1 }
    )

    const payload = {
      barcode: parsed.normalized,
      barcode_type: parsed.type,
      product_id: input.product_id,
      variant_id: input.variant_id ?? null,
      provider: input.provider,
      product_data: input.product_data as unknown as Record<string, unknown>,
      last_synced_at: new Date(),
      status: input.status || (existing[0] ? "updated" : "created"),
    }

    if (existing[0]) {
      return await this.updateBarcodeProducts({
        id: existing[0].id,
        ...payload,
      })
    }

    return await this.createBarcodeProducts(payload)
  }

  /**
   * Generates a valid GS1 in-store EAN-13 barcode (prefix 200-299).
   */
  async generateInternalVariantBarcode(input: {
    seed: string
    sequence?: number
    prefix?: string
  }): Promise<{
    barcode: string
    ean: string
    upc: string
    symbology: BarcodeSymbology
    svg: string
  }> {
    const prefix =
      input.prefix || this.options_.internalBarcodePrefix || "200"
    const ean13 = generateInternalEan13(input.seed, prefix, input.sequence)
    const upc = ean13.slice(1) // 12-digit representation
    const svg = renderBarcodeSvg({
      code: ean13,
      symbology: "ean13",
      includeText: true,
    })

    return {
      barcode: ean13,
      ean: ean13,
      upc,
      symbology: "ean13",
      svg,
    }
  }

  /**
   * Renders any supported 1D/2D barcode symbology into a standalone SVG string.
   */
  async renderSvg(options: RenderBarcodeSvgOptions): Promise<string> {
    if (!options.code || !String(options.code).trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Barcode value is required to render SVG"
      )
    }
    return renderBarcodeSvg(options)
  }

  /**
   * Creates or updates a dynamic `BarcodeTag` (1D barcode or 2D QR/DataMatrix token)
   * with storefront scan action, optional GS1 Digital Link, and HMAC-SHA256 anti-counterfeit signature.
   */
  async createOrUpdateBarcodeTag(input: {
    code?: string
    target_type?: "product" | "variant" | "order" | "custom"
    target_id: string
    product_id?: string | null
    variant_id?: string | null
    label?: string | null
    symbology?: BarcodeSymbology
    scan_action?: BarcodeScanAction
    gs1_gtin?: string | null
    batch_lot?: string | null
    serial_number?: string | null
    target_url?: string | null
    svg_url?: string | null
    metadata?: Record<string, unknown> | null
  }) {
    if (!input.target_id || !String(input.target_id).trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "target_id is required to create a BarcodeTag"
      )
    }

    const symbology: BarcodeSymbology = input.symbology || "qr"
    const scanAction: BarcodeScanAction = input.scan_action || "view"
    const targetType = input.target_type || "product"

    let code = input.code?.trim() || ""
    if (!code) {
      if (symbology === "ean13") {
        code = generateInternalEan13(
          `${targetType}:${input.target_id}`,
          this.options_.internalBarcodePrefix || "200"
        )
      } else {
        code = generateShortScanCode("mpb")
      }
    }

    const hmacSignature = createAuthenticityHmac(
      {
        code,
        targetId: input.target_id,
        serialNumber: input.serial_number ?? null,
        batchLot: input.batch_lot ?? null,
      },
      this.hmacSecret_
    )

    const baseUrl = (
      this.options_.storefrontBaseUrl || "https://store.example.com"
    ).replace(/\/$/, "")

    let resolvedUrl = input.target_url || null
    if (!resolvedUrl) {
      if (scanAction === "gs1_digital_link" && (input.gs1_gtin || code)) {
        resolvedUrl = buildGs1DigitalLink({
          baseUrl,
          gtin: input.gs1_gtin || code,
          batchLot: input.batch_lot,
          serial: input.serial_number,
        })
      } else if (scanAction === "verify") {
        resolvedUrl = `${baseUrl}/barcodes/${encodeURIComponent(
          code
        )}/verify?sig=${encodeURIComponent(hmacSignature)}`
      } else if (scanAction === "add_to_cart") {
        const variantParam = input.variant_id || input.target_id
        resolvedUrl = `${baseUrl}/cart/add?variant_id=${encodeURIComponent(
          variantParam
        )}&code=${encodeURIComponent(code)}`
      } else {
        resolvedUrl = `${baseUrl}/products/${encodeURIComponent(
          input.product_id || input.target_id
        )}?code=${encodeURIComponent(code)}`
      }
    }

    const encodedPayload =
      symbology === "qr" || symbology === "datamatrix" ? resolvedUrl : code

    const svgMarkup = renderBarcodeSvg({
      code: encodedPayload,
      symbology,
      title: input.label || undefined,
      includeText: symbology !== "qr" && symbology !== "datamatrix",
    })

    const existing = await this.listBarcodeTags({ code }, { take: 1 })
    const payload = {
      code,
      target_type: targetType,
      target_id: input.target_id,
      product_id: input.product_id ?? null,
      variant_id: input.variant_id ?? null,
      label: input.label ?? null,
      symbology,
      scan_action: scanAction,
      gs1_gtin: input.gs1_gtin ?? null,
      batch_lot: input.batch_lot ?? null,
      serial_number: input.serial_number ?? null,
      hmac_signature: hmacSignature,
      target_url: resolvedUrl,
      svg_markup: svgMarkup,
      svg_url: input.svg_url ?? null,
      is_active: true,
      metadata: input.metadata ?? null,
    }

    if (existing[0]) {
      return await this.updateBarcodeTags({
        id: existing[0].id,
        ...payload,
      })
    }

    return await this.createBarcodeTags({
      ...payload,
      scan_count: 0,
      last_scanned_at: null,
    })
  }

  /**
   * Resolves a storefront or admin scan against `BarcodeTag` and `BarcodeProduct`,
   * incrementing scan analytics when a tag is matched.
   */
  async resolveBarcodeScan(codeOrBarcode: string) {
    const clean = String(codeOrBarcode || "").trim()
    if (!clean) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Scan code is required"
      )
    }

    const parsed = parseBarcode(clean)
    const tags = await this.listBarcodeTags({ code: clean }, { take: 1 })
    let tag = tags[0] || null

    if (tag) {
      const nextCount = Number(tag.scan_count || 0) + 1
      tag = await this.updateBarcodeTags({
        id: tag.id,
        scan_count: nextCount,
        last_scanned_at: new Date(),
      })
    }

    const barcodeProducts = await this.listBarcodeProducts(
      { barcode: parsed.normalized },
      { take: 1 }
    )
    const barcodeProduct = barcodeProducts[0] || null

    return {
      code: clean,
      parsed,
      found: Boolean(tag || barcodeProduct),
      action: (tag?.scan_action as BarcodeScanAction) || "view",
      target_url: tag?.target_url || null,
      product_id: tag?.product_id || barcodeProduct?.product_id || null,
      variant_id: tag?.variant_id || barcodeProduct?.variant_id || null,
      tag,
      barcode_product: barcodeProduct,
    }
  }

  /**
   * Verifies an anti-counterfeit HMAC-SHA256 signature for a `BarcodeTag`.
   */
  async verifyAuthenticityToken(code: string, providedSignature: string) {
    const cleanCode = String(code || "").trim()
    if (!cleanCode || !providedSignature) {
      return {
        valid: false,
        code: cleanCode,
        reason: "Missing code or signature",
        tag: null,
      }
    }

    const tags = await this.listBarcodeTags({ code: cleanCode }, { take: 1 })
    const tag = tags[0]
    if (!tag || !tag.is_active) {
      return {
        valid: false,
        code: cleanCode,
        reason: "Tag not found or inactive",
        tag: null,
      }
    }

    const isValid = verifyAuthenticityHmac(
      {
        code: tag.code,
        targetId: tag.target_id,
        serialNumber: tag.serial_number,
        batchLot: tag.batch_lot,
      },
      providedSignature,
      this.hmacSecret_
    )

    if (isValid) {
      const nextCount = Number(tag.scan_count || 0) + 1
      const updated = await this.updateBarcodeTags({
        id: tag.id,
        scan_count: nextCount,
        last_scanned_at: new Date(),
      })
      return {
        valid: true,
        code: cleanCode,
        reason: "Authentic verified tag",
        tag: updated,
      }
    }

    return {
      valid: false,
      code: cleanCode,
      reason: "Invalid HMAC signature",
      tag: null,
    }
  }

  /**
   * Lists all built-in + custom label templates.
   */
  async listAllLabelTemplates(): Promise<LabelTemplateSpec[]> {
    const builtinList = Object.values(BUILTIN_LABEL_TEMPLATES)
    try {
      const customRows = await this.listBarcodeLabelTemplates({}, { take: 100 })
      const customMapped: LabelTemplateSpec[] = customRows.map((row) => ({
        id: row.id,
        name: row.name,
        preset_id: (row.preset_id as LabelPresetId) || "custom",
        layout_type: row.layout_type as "thermal_roll" | "a4_sheet",
        width_mm: Number(row.width_mm),
        height_mm: Number(row.height_mm),
        columns: Number(row.columns),
        rows: Number(row.rows),
        margin_top_mm: Number(row.margin_top_mm),
        margin_left_mm: Number(row.margin_left_mm),
        gap_x_mm: Number(row.gap_x_mm),
        gap_y_mm: Number(row.gap_y_mm),
        symbology: (row.symbology as BarcodeSymbology) || "ean13",
        show_title: Boolean(row.show_title),
        show_variant_title: Boolean(row.show_variant_title),
        show_sku: Boolean(row.show_sku),
        show_price: Boolean(row.show_price),
        show_compare_at_price: Boolean(row.show_compare_at_price),
        show_brand: Boolean(row.show_brand),
        show_qr: Boolean(row.show_qr),
        custom_header: row.custom_header ?? null,
        custom_footer: row.custom_footer ?? null,
        dpi: (Number(row.dpi) === 300 ? 300 : 203) as 203 | 300,
        is_default: Boolean(row.is_default),
      }))
      return [...builtinList, ...customMapped]
    } catch {
      return builtinList
    }
  }

  /**
   * Renders printable HTML+SVG and Zebra ZPL II output for a list of label items.
   */
  async renderLabels(input: {
    items: LabelPrintItem[]
    template_id?: string
    template_override?: Partial<LabelTemplateSpec>
  }): Promise<LabelPrintOutput> {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one label item is required for printing"
      )
    }

    const templates = await this.listAllLabelTemplates()
    const baseTemplate =
      templates.find(
        (t) =>
          t.id === input.template_id || t.preset_id === input.template_id
      ) || BUILTIN_LABEL_TEMPLATES.thermal_50x25

    const mergedTemplate: LabelTemplateSpec = {
      ...baseTemplate,
      ...(input.template_override || {}),
    }

    return renderPrintableLabels(input.items, mergedTemplate)
  }

  /**
   * Creates a new stock-take inventory count session (`BarcodeCountSession`).
   */
  async createStockCountSession(input: {
    name: string
    location_id?: string | null
    notes?: string | null
    created_by?: string | null
    expected_items?: Array<{
      barcode: string
      variant_id?: string | null
      product_id?: string | null
      title: string
      variant_title?: string | null
      sku?: string | null
      expected_quantity: number
    }>
  }) {
    if (!input.name || !input.name.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Session name is required"
      )
    }

    const expectedItems = input.expected_items || []
    const totalExpected = expectedItems.reduce(
      (sum, item) => sum + Math.max(0, Number(item.expected_quantity || 0)),
      0
    )

    const session = await this.createBarcodeCountSessions({
      name: input.name.trim(),
      location_id: input.location_id ?? null,
      status: "in_progress",
      notes: input.notes ?? null,
      total_expected: totalExpected,
      total_counted: 0,
      total_variance: -totalExpected,
      total_scans: 0,
      created_by: input.created_by ?? null,
    })

    const createdItems: Array<Awaited<
      ReturnType<typeof this.createBarcodeCountItems>
    >[number]> = []
    for (const item of expectedItems) {
      const parsed = parseBarcode(item.barcode)
      const expectedQty = Math.max(0, Number(item.expected_quantity || 0))
      const created = await this.createBarcodeCountItems({
        session_id: session.id,
        barcode: parsed.normalized,
        variant_id: item.variant_id ?? null,
        product_id: item.product_id ?? null,
        title: item.title,
        variant_title: item.variant_title ?? null,
        sku: item.sku ?? null,
        expected_quantity: expectedQty,
        counted_quantity: 0,
        variance: -expectedQty,
      })
      createdItems.push(created)
    }

    return {
      session,
      items: createdItems,
    }
  }

  /**
   * Records a barcode scan inside a `BarcodeCountSession` and recalculates session variance totals.
   */
  async recordCountSessionScan(input: {
    session_id: string
    barcode: string
    delta?: number
    set_quantity?: number
    variant_id?: string | null
    product_id?: string | null
    title?: string
    variant_title?: string | null
    sku?: string | null
    expected_quantity?: number
  }) {
    const sessions = await this.listBarcodeCountSessions(
      { id: input.session_id },
      { take: 1 }
    )
    const session = sessions[0]
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Count session ${input.session_id} not found`
      )
    }
    if (session.status !== "in_progress") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Count session ${input.session_id} is already ${session.status}`
      )
    }

    const parsed = parseBarcode(input.barcode)
    const existingItems = await this.listBarcodeCountItems(
      { session_id: input.session_id, barcode: parsed.normalized },
      { take: 1 }
    )

    let item = existingItems[0]
    if (item) {
      const nextCounted =
        typeof input.set_quantity === "number"
          ? Math.max(0, input.set_quantity)
          : Math.max(0, Number(item.counted_quantity || 0) + (input.delta ?? 1))
      const expected = Number(item.expected_quantity || 0)
      item = await this.updateBarcodeCountItems({
        id: item.id,
        counted_quantity: nextCounted,
        variance: nextCounted - expected,
        last_scanned_at: new Date(),
      })
    } else {
      const expected = Math.max(0, Number(input.expected_quantity || 0))
      const counted =
        typeof input.set_quantity === "number"
          ? Math.max(0, input.set_quantity)
          : Math.max(0, input.delta ?? 1)
      item = await this.createBarcodeCountItems({
        session_id: input.session_id,
        barcode: parsed.normalized,
        variant_id: input.variant_id ?? null,
        product_id: input.product_id ?? null,
        title: input.title || `Scanned Item (${parsed.normalized})`,
        variant_title: input.variant_title ?? null,
        sku: input.sku ?? null,
        expected_quantity: expected,
        counted_quantity: counted,
        variance: counted - expected,
        last_scanned_at: new Date(),
      })
    }

    const allItems = await this.listBarcodeCountItems(
      { session_id: input.session_id },
      { take: 1000 }
    )
    const totalExpected = allItems.reduce(
      (sum, row) => sum + Number(row.expected_quantity || 0),
      0
    )
    const totalCounted = allItems.reduce(
      (sum, row) => sum + Number(row.counted_quantity || 0),
      0
    )
    const totalVariance = totalCounted - totalExpected
    const updatedSession = await this.updateBarcodeCountSessions({
      id: session.id,
      total_expected: totalExpected,
      total_counted: totalCounted,
      total_variance: totalVariance,
      total_scans: Number(session.total_scans || 0) + 1,
    })

    return {
      session: updatedSession,
      item,
      items: allItems,
    }
  }

  /**
   * Marks a count session as completed.
   */
  async completeCountSession(sessionId: string) {
    const sessions = await this.listBarcodeCountSessions(
      { id: sessionId },
      { take: 1 }
    )
    const session = sessions[0]
    if (!session) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Count session ${sessionId} not found`
      )
    }

    const items = await this.listBarcodeCountItems(
      { session_id: sessionId },
      { take: 1000 }
    )

    const updated = await this.updateBarcodeCountSessions({
      id: sessionId,
      status: "completed",
      completed_at: new Date(),
    })

    return {
      session: updated,
      items,
    }
  }

  /**
   * Purges expired entries from `BarcodeCache`.
   */
  async purgeExpiredCache(): Promise<{ purged_count: number }> {
    const allCache = await this.listBarcodeCaches({}, { take: 1000 })
    const now = Date.now()
    const expiredIds = allCache
      .filter(
        (row) => row.expires_at && new Date(row.expires_at).getTime() <= now
      )
      .map((row) => row.id)

    if (expiredIds.length > 0) {
      await this.deleteBarcodeCaches(expiredIds)
    }

    return { purged_count: expiredIds.length }
  }

  /**
   * Returns a dashboard analytics overview across products, tags, cache, and stock-take sessions.
   */
  async getAnalyticsOverview() {
    const [products, tags, caches, sessions] = await Promise.all([
      this.listBarcodeProducts({}, { take: 1000 }),
      this.listBarcodeTags({}, { take: 1000 }),
      this.listBarcodeCaches({}, { take: 1000 }),
      this.listBarcodeCountSessions({}, { take: 200 }),
    ])

    const totalTagScans = tags.reduce(
      (sum, t) => sum + Number(t.scan_count || 0),
      0
    )
    const totalCacheHits = caches.reduce(
      (sum, c) => sum + Number(c.hit_count || 0),
      0
    )

    return {
      total_barcode_products: products.length,
      total_barcode_tags: tags.length,
      total_tag_scans: totalTagScans,
      total_cached_lookups: caches.length,
      total_cache_hits: totalCacheHits,
      total_count_sessions: sessions.length,
      active_providers: this.registry_.getProviderNames(),
    }
  }
}

export {
  BarcodeCache,
  BarcodeCountItem,
  BarcodeCountSession,
  BarcodeLabelTemplate,
  BarcodeProduct,
  BarcodeTag,
}

/**
 * Alias for backward compatibility with `@bambiste/medusa-barcode`.
 */
export const BarcodeService = BarcodeModuleService
