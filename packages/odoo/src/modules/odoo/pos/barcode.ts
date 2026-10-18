import type {
  OdooBarcodeContext,
  OdooBarcodeResolutionResult,
  OdooPosSettings,
} from "../types"
import type { OdooModuleService } from "../service"
import { odooMetrics } from "../utils/metrics"
import { resolveQueryGraph } from "../utils/scope"

export interface BarcodeCacheEntry {
  result: Omit<OdooBarcodeResolutionResult, "source" | "latencyMs" | "resolvedAt">
  expiresAt: number
}

const MAX_BARCODE_CACHE_ENTRIES = 5000

/** Stores a resolution, evicting expired (then oldest) entries past the cap. */
const cacheBarcodeResult = (
  svc: OdooModuleService,
  key: string,
  result: BarcodeCacheEntry["result"],
  ttlSec: number
): void => {
  const cache = svc.barcodeCache_
  if (cache.size >= MAX_BARCODE_CACHE_ENTRIES) {
    const now = Date.now()
    for (const [k, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(k)
    }
    while (cache.size >= MAX_BARCODE_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value
      if (oldest === undefined) break
      cache.delete(oldest)
    }
  }
  cache.set(key, { result, expiresAt: Date.now() + ttlSec * 1000 })
}

export async function resolveBarcode(this: OdooModuleService, params: {
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
      const query = resolveQueryGraph(this.container_, params.scope)
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
      cacheBarcodeResult(this, cacheKey, baseResult, ttlSec)

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

      cacheBarcodeResult(this, cacheKey, baseResult, ttlSec)

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

export async function invalidateBarcodeCache(
  this: OdooModuleService,
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

export async function warmBarcodeCache(
  this: OdooModuleService,
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
