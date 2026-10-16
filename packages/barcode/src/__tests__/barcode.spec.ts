import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  BARCODE_MODULE,
  BarcodeModuleService,
  BaseBarcodeProvider,
  buildGs1DigitalLink,
  BUILTIN_LABEL_TEMPLATES,
  computeEan13CheckDigit,
  computeGs1CheckDigit,
  escapeHtml,
  generateInternalEan13,
  mapToMedusaCreateProduct,
  mergeNormalizedProducts,
  type NormalizedBarcodeProduct,
  parseBarcode,
  parseGs1ApplicationIdentifiers,
  ProviderRegistry,
  renderBarcodeSvg,
  renderPrintableLabels,
  runProviderLookupChain,
  upcToEan13,
  validateExternalImageUrl,
  validateGs1Checksum,
} from "../modules/barcode"
import {
  applyInventoryCountWorkflow,
  batchBarcodeImportWorkflow,
  bulkGenerateVariantBarcodesWorkflow,
  generateBarcodeTagWorkflow,
  lookupAndCreateProductWorkflow,
  scanInventoryCountWorkflow,
} from "../workflows"
import middlewares from "../api/middlewares"
import { adminI18n, SUPPORTED_UI_LOCALES } from "../index"
import { createBarcodeSdk } from "../sdk"


class MockProvider extends BaseBarcodeProvider {
  readonly name: string
  private readonly mockData: Partial<NormalizedBarcodeProduct> | null

  constructor(
    name: string,
    priority: number,
    mockData: Partial<NormalizedBarcodeProduct> | null
  ) {
    super({ priority })
    this.name = name
    this.mockData = mockData
  }

  async lookup(barcode: string): Promise<NormalizedBarcodeProduct | null> {
    if (!this.mockData) return null
    return {
      barcode,
      barcode_type: "ean13",
      name: this.mockData.name || "Mock Product",
      description: this.mockData.description ?? null,
      brand: this.mockData.brand ?? null,
      manufacturer: this.mockData.manufacturer ?? null,
      categories: this.mockData.categories || [],
      images: this.mockData.images || [],
      weight: this.mockData.weight ?? null,
      weight_unit: this.mockData.weight_unit ?? null,
      dimensions: this.mockData.dimensions ?? null,
      quantity_label: this.mockData.quantity_label ?? null,
      ingredients: this.mockData.ingredients ?? null,
      nutrition: this.mockData.nutrition ?? null,
      country_of_origin: this.mockData.country_of_origin ?? null,
      suggested_price: this.mockData.suggested_price ?? null,
      currency_code: this.mockData.currency_code ?? "USD",
      isbn: this.mockData.isbn ?? null,
      authors: this.mockData.authors || [],
      publisher: this.mockData.publisher ?? null,
      published_date: this.mockData.published_date ?? null,
      page_count: this.mockData.page_count ?? null,
      provider: this.name,
      raw_data: {},
    }
  }
}

describe("medusa-plugin-barcode — GS1 Parser, Checksum & Digital Link", () => {
  it("validates GS1 Modulo-10 check digits right-to-left across odd and even lengths", () => {
    // EAN-13 (Nutella 3017620422003)
    assert.equal(computeEan13CheckDigit("301762042200"), 3)
    assert.equal(validateGs1Checksum("3017620422003"), true)
    assert.equal(validateGs1Checksum("3017620422004"), false)

    // UPC-A (12 digits - even length! Fixes @bambiste/medusa-barcode bug)
    assert.equal(computeGs1CheckDigit("01234567890"), 5)
    assert.equal(validateGs1Checksum("012345678905"), true)
    assert.equal(upcToEan13("012345678905"), "0012345678905")

    // EAN-8 (8 digits - even length)
    assert.equal(computeGs1CheckDigit("9638507"), 4)
    assert.equal(validateGs1Checksum("96385074"), true)

    // GTIN-14 (14 digits - even length)
    assert.equal(computeGs1CheckDigit("1061414100041"), 5)
    assert.equal(validateGs1Checksum("10614141000415"), true)
  })

  it("identifies ISBN-13 (978/979) and GS1-128 Application Identifiers", () => {
    const isbn = parseBarcode("9780140328721")
    assert.equal(isbn.type, "isbn13")
    assert.equal(isbn.isIsbn, true)
    assert.equal(isbn.isValid, true)

    const gs1 = parseBarcode(
      "(01)09506000134352(10)LOT2026(17)261231(21)SN9988(3102)001250"
    )
    assert.equal(gs1.type, "gs1-128")
    assert.equal(gs1.isValid, true)
    assert.equal(gs1.gs1?.gtin, "09506000134352")
    assert.equal(gs1.gs1?.batchLot, "LOT2026")
    assert.equal(gs1.gs1?.expiryDate, "2026-12-31")
    assert.equal(gs1.gs1?.serialNumber, "SN9988")
    assert.equal(gs1.gs1?.netWeightKg, 12.5)

    const directAi = parseGs1ApplicationIdentifiers("(01)04006381333931(10)B42")
    assert.equal(directAi?.gtin, "04006381333931")
    assert.equal(directAi?.batchLot, "B42")
  })

  it("generates valid GS1 in-store EAN-13 (prefix 200-299) and GS1 Digital Link URIs", () => {
    const internal1 = generateInternalEan13("variant_01", "200")
    const internal2 = generateInternalEan13("variant_01", "200")
    assert.equal(internal1, internal2)
    assert.equal(internal1.length, 13)
    assert.equal(internal1.startsWith("200"), true)
    assert.equal(validateGs1Checksum(internal1), true)

    const digitalLink = buildGs1DigitalLink({
      baseUrl: "https://id.store.com",
      gtin: "3017620422003",
      batchLot: "LOT-7",
      serial: "SN-42",
      expiry: "261231",
    })
    assert.equal(
      digitalLink,
      "https://id.store.com/01/03017620422003/10/LOT-7/21/SN-42?17=261231"
    )
  })
})

describe("medusa-plugin-barcode — Multi-Provider Chain & Deep-Merge Enrichment", () => {
  it("supports both first-hit and deep-merge enrichment strategies", async () => {
    const registry = new ProviderRegistry()
    registry.register(
      new MockProvider("openfoodfacts", 10, {
        name: "Artisan Hazelnut Spread",
        brand: "Ferrero",
        images: ["https://images.example.com/front.jpg"],
        description: null,
        ingredients: "Sugar, Palm Oil, Hazelnuts",
      })
    )
    registry.register(
      new MockProvider("upcitemdb", 20, {
        name: "Hazelnut Spread 400g",
        brand: "Ferrero",
        description: "Rich chocolate hazelnut spread imported from Italy.",
        images: ["https://images.example.com/side.jpg"],
        suggested_price: 6.99,
      })
    )

    const firstHit = await runProviderLookupChain("3017620422003", registry, {
      strategy: "first-hit",
    })
    assert.equal(firstHit.found, true)
    assert.equal(firstHit.outcomes.length, 1)
    assert.equal(firstHit.product?.description, null)

    const deepMerge = await runProviderLookupChain("3017620422003", registry, {
      strategy: "deep-merge",
    })
    assert.equal(deepMerge.found, true)
    assert.equal(deepMerge.outcomes.length, 2)
    assert.equal(deepMerge.product?.name, "Artisan Hazelnut Spread")
    assert.equal(
      deepMerge.product?.description,
      "Rich chocolate hazelnut spread imported from Italy."
    )
    assert.equal(deepMerge.product?.images.length, 2)
    assert.equal(deepMerge.product?.suggested_price, 6.99)
  })

  it("prioritizes GoogleBooks and OpenLibrary automatically for 978/979 ISBNs", () => {
    const registry = new ProviderRegistry()
    registry.register(new MockProvider("openfoodfacts", 10, null))
    registry.register(new MockProvider("googlebooks", 50, null))
    registry.register(new MockProvider("openlibrary", 60, null))

    const ordered = registry.getOrderedForBarcode("9780140328721", "isbn13")
    assert.equal(ordered[0]?.name, "googlebooks")
    assert.equal(ordered[1]?.name, "openlibrary")
    assert.equal(ordered[2]?.name, "openfoodfacts")
  })
})

describe("medusa-plugin-barcode — SVG Renderer, Thermal/Sheet Labels & ZPL II", () => {
  it("renders 1D and 2D barcodes as standalone SVGs and escapes XSS payloads", () => {
    const eanSvg = renderBarcodeSvg({
      code: "3017620422003",
      symbology: "ean13",
      title: 'Nutella <script>alert("xss")</script>',
    })
    assert.equal(eanSvg.startsWith("<svg"), true)
    assert.equal(eanSvg.includes("<script>"), false)
    assert.equal(eanSvg.includes("&lt;script&gt;"), true)

    const qrSvg = renderBarcodeSvg({
      code: "https://store.example.com/products/nutella",
      symbology: "qr",
    })
    assert.equal(qrSvg.startsWith("<svg"), true)
    assert.equal(qrSvg.includes("<path"), true)

    const dmSvg = renderBarcodeSvg({
      code: "010301762042200310LOT1",
      symbology: "datamatrix",
    })
    assert.equal(dmSvg.startsWith("<svg"), true)
  })

  it("renders print-ready HTML+SVG and Zebra ZPL II across thermal & A4 presets", () => {
    assert.equal(Object.keys(BUILTIN_LABEL_TEMPLATES).length, 7)

    const output = renderPrintableLabels(
      [
        {
          barcode: "3017620422003",
          title: 'Organic Roast <img src=x onerror=alert(1)>',
          variant_title: "250g Bag",
          sku: "ORG-250",
          brand: "Medusa Coffee",
          price: 12.5,
          compare_at_price: 16.0,
          currency_code: "USD",
          quantity: 3,
        },
      ],
      "thermal_57x32"
    )

    assert.equal(output.total_labels, 3)
    assert.equal(output.html.includes("<!DOCTYPE html>"), true)
    assert.equal(output.html.includes("$12.50"), true)
    assert.equal(output.html.includes("$16.00"), true)
    assert.equal(output.html.includes("<img src=x"), false)
    assert.equal(output.html.includes("&lt;img src=x"), true)
    assert.equal(output.zpl.includes("^XA"), true)
    assert.equal(output.zpl.includes("^XZ"), true)
    assert.equal(output.zpl.includes("^BEN"), true)
  })
})

describe("medusa-plugin-barcode — BarcodeModuleService, HMAC Security & Workflows", () => {
  it("verifies anti-counterfeit HMAC-SHA256 signatures and rejects tampered tokens", async () => {
    const service = new BarcodeModuleService(
      {},
      { hmacSecret: "unit-test-super-secret-hmac-key-2026" }
    )

    const tag = await service.createOrUpdateBarcodeTag({
      code: "MPB-AUTH-001",
      target_type: "product",
      target_id: "prod_luxury_watch",
      symbology: "qr",
      scan_action: "verify",
      serial_number: "SN-9001",
      batch_lot: "BATCH-26",
    })

    assert.equal(typeof tag.hmac_signature, "string")
    const sig = tag.hmac_signature ?? ""
    assert.equal(sig.length, 64)

    const validCheck = await service.verifyAuthenticityToken(
      "MPB-AUTH-001",
      sig
    )
    assert.equal(validCheck.valid, true)
    assert.equal(validCheck.tag?.scan_count, 1)

    const tamperedCheck = await service.verifyAuthenticityToken(
      "MPB-AUTH-001",
      "0000000000000000000000000000000000000000000000000000000000000000"
    )
    assert.equal(tamperedCheck.valid, false)
  })

  it("blocks SSRF private/loopback/non-HTTPS URLs in validateExternalImageUrl", () => {
    assert.equal(
      validateExternalImageUrl("https://images.openfoodfacts.org/front.jpg"),
      "https://images.openfoodfacts.org/front.jpg"
    )
    assert.equal(validateExternalImageUrl("http://localhost:9000/secret"), null)
    assert.equal(validateExternalImageUrl("https://127.0.0.1/admin"), null)
    assert.equal(
      validateExternalImageUrl("https://169.254.169.254/latest/meta-data/"),
      null
    )
    assert.equal(validateExternalImageUrl("https://192.168.1.1/router"), null)
    assert.equal(validateExternalImageUrl("https://10.0.0.1/internal"), null)
    assert.equal(validateExternalImageUrl("javascript:alert(1)"), null)
    assert.equal(escapeHtml('<svg onload="alert(1)">'), "&lt;svg onload=&quot;alert(1)&quot;&gt;")
  })

  it("executes product creation, batch import, bulk variant barcode generation, and stock-take workflows with compensation", async () => {
    const barcodeService = new BarcodeModuleService()
    const registry = await barcodeService.getProviderRegistry()
    registry.register(
      new MockProvider("mock_catalog", 1, {
        name: "Sparkling Mineral Water",
        brand: "Alpine",
        suggested_price: 2.5,
      })
    )

    const createdMedusaProducts: Array<Record<string, unknown>> = []
    const mockVariants: Array<Record<string, unknown>> = [
      { id: "var_101", product_id: "prod_101", title: "Default", barcode: null },
      { id: "var_102", product_id: "prod_102", title: "Large", barcode: null },
    ]

    const mockProductService = {
      async createProducts(payloads: Array<Record<string, unknown>>) {
        const created = payloads.map((p, i) => ({
          id: `medusa_prod_${createdMedusaProducts.length + i + 1}`,
          ...p,
          variants: [{ id: `medusa_var_${createdMedusaProducts.length + i + 1}` }],
        }))
        createdMedusaProducts.push(...created)
        return created
      },
      async deleteProducts(ids: string[]) {
        const idSet = new Set(ids)
        for (let i = createdMedusaProducts.length - 1; i >= 0; i--) {
          if (idSet.has(String(createdMedusaProducts[i]?.id))) {
            createdMedusaProducts.splice(i, 1)
          }
        }
      },
      async listProductVariants() {
        return mockVariants
      },
      async upsertProductVariants(updates: Array<Record<string, unknown>>) {
        for (const u of updates) {
          const target = mockVariants.find((v) => v.id === u.id)
          if (target) Object.assign(target, u)
        }
      },
    }

    const container = {
      resolve(key: string) {
        if (key === BARCODE_MODULE) return barcodeService
        if (key === "product") return mockProductService
        throw new Error(`Unknown key ${key}`)
      },
    }

    // 1. lookupAndCreateProductWorkflow
    const singleRun = (await lookupAndCreateProductWorkflow(
      container as never
    ).run({
      input: {
        barcode: "3017620422003",
        status: "published",
      },
    })) as unknown as {
      result: {
        product_id: string
        lookup: { product: NormalizedBarcodeProduct | null }
      }
      compensate?: () => Promise<void>
    }
    assert.equal(singleRun.result.product_id, "medusa_prod_1")
    assert.equal(createdMedusaProducts.length, 1)

    // Test rollback/compensation
    await singleRun.compensate?.()
    assert.equal(createdMedusaProducts.length, 0)

    // 2. batchBarcodeImportWorkflow (genuinely creates Medusa products!)
    const batchRun = await batchBarcodeImportWorkflow(container as never).run({
      input: {
        barcodes: ["3017620422003", "4006381333931"],
        status: "draft",
      },
    })
    assert.equal(batchRun.result.imported_count, 2)
    assert.equal(createdMedusaProducts.length, 2)

    // 3. bulkGenerateVariantBarcodesWorkflow
    const bulkGen = await bulkGenerateVariantBarcodesWorkflow(
      container as never
    ).run({
      input: { prefix: "205" },
    })
    assert.equal(bulkGen.result.generated_count, 2)
    assert.equal(String(mockVariants[0]?.barcode).startsWith("205"), true)
    assert.equal(validateGs1Checksum(String(mockVariants[0]?.barcode)), true)

    // 4. Stock-Take Count Session & Scan + Apply Workflows
    const sessionCreated = await barcodeService.createStockCountSession({
      name: "Monthly Warehouse Count",
      location_id: "loc_01",
      expected_items: [
        {
          barcode: "3017620422003",
          title: "Sparkling Mineral Water",
          sku: "GTIN-3017620422003",
          expected_quantity: 10,
        },
      ],
    })

    const scanRun = await scanInventoryCountWorkflow(container as never).run({
      input: {
        session_id: sessionCreated.session.id,
        barcode: "3017620422003",
        set_quantity: 12,
      },
    })
    assert.equal(scanRun.result.item.counted_quantity, 12)
    assert.equal(scanRun.result.item.variance, 2)

    const applyRun = await applyInventoryCountWorkflow(container as never).run({
      input: {
        session_id: sessionCreated.session.id,
      },
    })
    assert.equal(applyRun.result.session.status, "completed")
    assert.equal(applyRun.result.adjustments[0]?.variance, 2)

    // 5. generateBarcodeTagWorkflow
    const tagWf = await generateBarcodeTagWorkflow(container as never).run({
      input: {
        target_id: "prod_101",
        symbology: "qr",
        scan_action: "gs1_digital_link",
        gs1_gtin: "3017620422003",
      },
    })
    assert.equal(
      String(tagWf.result.target_url).includes("/01/03017620422003"),
      true
    )

    // Verify mapToMedusaCreateProduct, mergeNormalizedProducts, middlewares & SDK export
    const merged = mergeNormalizedProducts([
      singleRun.result.lookup.product!,
    ])
    const mapped = mapToMedusaCreateProduct(merged!)
    assert.equal(mapped.variants[0]?.barcode, "3017620422003")
    assert.equal(Array.isArray(middlewares.routes), true)
    assert.equal((middlewares.routes?.length ?? 0) >= 10, true)

    const sdk = createBarcodeSdk({ baseUrl: "https://api.store.com" })
    assert.equal(
      sdk.store.getSvgUrl("3017620422003", "ean13"),
      "https://api.store.com/store/barcodes/3017620422003?format=svg&symbology=ean13"
    )
  })
})

describe("medusa-plugin-barcode — Admin UI Localization (10 Locales Key Parity)", () => {
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
    assert.ok(enKeys.length >= 120)

    for (const localeCode of locales) {
      const entry = bundles[localeCode]
      assert.ok(entry, `Missing locale bundle for ${localeCode}`)
      assert.equal(entry.barcodes, entry.translation)
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

  it("exports Medusa v2 Admin multi-route pages, breadcrumbs, drawer modal, widget, and modular components", async () => {
    const overviewRoute = await import("../admin/routes/barcodes/page")
    const lookupRoute = await import("../admin/routes/barcodes/lookup/page")
    const tagsRoute = await import("../admin/routes/barcodes/tags/page")
    const tagsCreateRoute = await import(
      "../admin/routes/barcodes/tags/@create/page"
    )
    const printRoute = await import("../admin/routes/barcodes/print/page")
    const stockTakeRoute = await import(
      "../admin/routes/barcodes/stock-take/page"
    )
    const providersRoute = await import(
      "../admin/routes/barcodes/providers/page"
    )
    const widget = await import("../admin/widgets/product-barcode-widget")
    const components = await import("../admin/components")

    for (const route of [
      overviewRoute,
      lookupRoute,
      tagsRoute,
      printRoute,
      stockTakeRoute,
      providersRoute,
    ]) {
      assert.equal(typeof route.default, "function")
      assert.equal(route.config.translationNs, "barcodes")
      assert.equal(typeof route.handle.breadcrumb, "function")
    }

    assert.equal(typeof tagsCreateRoute.default, "function")
    assert.equal(typeof widget.default, "function")
    assert.equal(widget.config.zone, "product.details.after")
    assert.equal(typeof components.BarcodeStudioHeader, "function")
    assert.equal(typeof components.GtinLookupTab, "function")
    assert.equal(typeof components.DynamicQrTagsTab, "function")
    assert.equal(typeof components.LabelPrintCenterTab, "function")
    assert.equal(typeof components.WarehouseStockTakeTab, "function")
    assert.equal(typeof components.ProvidersCacheTab, "function")
    assert.equal(typeof components.ProductBarcodeCard, "function")
  })
})


