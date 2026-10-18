import { Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import { downloadProductImageBuffer } from "../modules/barcode/providers"
import type { BarcodeModuleService } from "../modules/barcode/service"
import {
  BARCODE_EVENTS,
  BARCODE_MODULE,
  type BarcodeScanAction,
  type BarcodeSymbology,
  type EnrichmentStrategy,
  type LookupAndCreateProductInput,
  type NormalizedBarcodeProduct,
  type VariantPriceInput,
} from "../modules/barcode/types"
import { parseBarcode } from "../modules/barcode/utils/barcode-parser"
import { mapToMedusaCreateProduct } from "../modules/barcode/utils/normalize-product"

export type { LookupAndCreateProductInput }

type AnyService = Record<string, (...args: unknown[]) => Promise<unknown>>

function tryResolveService(
  container: { resolve: (key: string) => unknown },
  keys: string[]
): AnyService | null {
  for (const key of keys) {
    try {
      const resolved = container.resolve(key)
      if (resolved && typeof resolved === "object") {
        return resolved as AnyService
      }
    } catch {
      // try next
    }
  }
  return null
}

const lookupAndCreateProductStep = createStep(
  "lookup-and-create-product",
  async (input: LookupAndCreateProductInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    const moduleOptions = await barcodeService.getModuleOptions()
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ])

    // Self-healing existing product check
    if (input.skipExistingCheck !== true) {
      const existingMapping = await barcodeService.findBarcodeProduct(
        input.barcode
      )
      if (existingMapping) {
        if (productService && typeof productService.listProducts === "function") {
          const existingProducts = (await productService.listProducts({
            id: [existingMapping.product_id],
          })) as Array<Record<string, unknown>>
          const foundExisting = Array.isArray(existingProducts)
            ? existingProducts.find(
                (p) => p.id === existingMapping.product_id
              ) ?? existingProducts[0]
            : null
          if (foundExisting) {
            const parsed = await barcodeService.parseAndValidateBarcode(
              input.barcode
            )
            const cachedProduct =
              (existingMapping.product_data as unknown as NormalizedBarcodeProduct) ||
              null
            return new StepResponse(
              {
                created: false,
                existing: true,
                product: foundExisting,
                product_id: existingMapping.product_id,
                variant_id: existingMapping.variant_id ?? null,
                product_payload: null,
                barcode_product: existingMapping,
                lookup: {
                  barcode: existingMapping.barcode,
                  parsed,
                  found: Boolean(cachedProduct),
                  cached: true,
                  strategy:
                    input.strategy ||
                    moduleOptions.enrichmentStrategy ||
                    "first-hit",
                  product: cachedProduct,
                  outcomes: [],
                },
              },
              {
                barcodeProductId: null,
                createdProductId: null,
              }
            )
          }
          // Product was deleted in Medusa — self-heal stale BarcodeProduct link
          await barcodeService.removeBarcodeProduct(input.barcode)
        }
      }
    }

    const lookupResult = await barcodeService.lookupBarcode(input.barcode, {
      skipCache: input.skipCache,
      strategy: input.strategy || moduleOptions.enrichmentStrategy,
    })

    const normalized: NormalizedBarcodeProduct = lookupResult.product || {
      barcode: lookupResult.barcode,
      barcode_type: lookupResult.parsed.type,
      name: input.overrideTitle || `Product ${lookupResult.barcode}`,
      description: input.overrideDescription || null,
      brand: null,
      manufacturer: null,
      categories: [],
      images: [],
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label: null,
      ingredients: null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: input.overridePrice ?? null,
      currency_code: input.currencyCode || "USD",
      isbn: lookupResult.parsed.isIsbn ? lookupResult.barcode : null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: "manual",
      raw_data: {},
    }

    // Optional File Module image upload
    const shouldDownload =
      input.downloadImages ?? moduleOptions.downloadProductImages ?? false
    if (shouldDownload && normalized.images.length > 0) {
      const fileService = tryResolveService(container, [
        Modules.FILE,
        "file",
      ])
      if (fileService && typeof fileService.createFiles === "function") {
        const uploadedUrls: string[] = []
        for (const imageUrl of normalized.images.slice(0, 3)) {
          const downloaded = await downloadProductImageBuffer(imageUrl)
          if (downloaded) {
            try {
              const createdFiles = (await fileService.createFiles([
                {
                  filename: downloaded.filename,
                  mimeType: downloaded.mimeType,
                  content: downloaded.buffer.toString("base64"),
                  access: "public",
                },
              ])) as Array<{ url?: string }>
              if (createdFiles?.[0]?.url) {
                uploadedUrls.push(createdFiles[0].url)
              }
            } catch {
              uploadedUrls.push(imageUrl)
            }
          }
        }
        if (uploadedUrls.length > 0) {
          normalized.images = uploadedUrls
        }
      }
    }

    const createPayload = mapToMedusaCreateProduct(normalized, {
      status: input.status || moduleOptions.defaultProductStatus || "draft",
      publishImmediately: input.publishImmediately,
      skuPrefix: input.skuPrefix || "GTIN",
      overrideTitle: input.overrideTitle,
      overrideDescription: input.overrideDescription,
      overridePrice: input.overridePrice,
      currencyCode: input.currencyCode,
      prices: input.prices,
      salesChannelIds: input.salesChannelIds,
      categoryIds: input.categoryIds,
      collectionId: input.collectionId,
    })

    let createdProductId = `prod_${lookupResult.barcode}`
    let createdVariantId: string | null = `variant_${lookupResult.barcode}`
    let createdProductObj: Record<string, unknown> | null = null
    let createdInProductModule = false

    if (productService && typeof productService.createProducts === "function") {
      const created = await productService.createProducts([createPayload])
      const firstProduct = Array.isArray(created) ? created[0] : created
      if (firstProduct && typeof firstProduct === "object" && "id" in firstProduct) {
        createdProductObj = firstProduct as Record<string, unknown>
        createdProductId = String((firstProduct as { id: string }).id)
        const variants = (
          firstProduct as { variants?: Array<{ id?: string }> }
        ).variants
        createdVariantId = variants?.[0]?.id ? String(variants[0].id) : null
        createdInProductModule = true
      }
    }

    const barcodeProduct = await barcodeService.upsertBarcodeProductLink({
      barcode: lookupResult.barcode,
      product_id: createdProductId,
      variant_id: createdVariantId,
      provider: normalized.provider,
      product_data: normalized,
      status: "created",
    })

    const eventBus = tryResolveService(container, [
      Modules.EVENT_BUS,
      "event_bus",
    ])
    if (eventBus && typeof eventBus.emit === "function") {
      try {
        await eventBus.emit({
          name: BARCODE_EVENTS.PRODUCT_CREATED,
          data: {
            barcode: lookupResult.barcode,
            product_id: createdProductId,
            variant_id: createdVariantId,
            provider: normalized.provider,
          },
        })
      } catch {
        // Non-fatal if event bus fails
      }
    }

    return new StepResponse(
      {
        created: true,
        existing: false,
        product: createdProductObj,
        lookup: lookupResult,
        product_id: createdProductId,
        variant_id: createdVariantId,
        product_payload: createPayload,
        barcode_product: barcodeProduct,
      },
      {
        barcodeProductId: barcodeProduct.id,
        createdProductId: createdInProductModule ? createdProductId : null,
      }
    )
  },
  async (compInput, { container }) => {
    if (!compInput) return
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    if (compInput.barcodeProductId) {
      await barcodeService.deleteBarcodeProducts([compInput.barcodeProductId])
    }
    if (compInput.createdProductId) {
      const productService = tryResolveService(container, [
        Modules.PRODUCT,
        "product",
      ])
      if (productService && typeof productService.deleteProducts === "function") {
        await productService.deleteProducts([compInput.createdProductId])
      }
    }
  }
)

export const lookupAndCreateProductWorkflow = createWorkflow(
  "lookup-and-create-product",
  (input: LookupAndCreateProductInput) => {
    const result = lookupAndCreateProductStep(input)
    return new WorkflowResponse(result)
  }
)

export interface BatchBarcodeImportInput {
  barcodes: string[]
  status?: "draft" | "published"
  publishImmediately?: boolean
  strategy?: EnrichmentStrategy
  createMissingAsDraft?: boolean
  prices?: VariantPriceInput[]
  salesChannelIds?: string[]
  categoryIds?: string[]
  collectionId?: string | null
}

const batchBarcodeImportStep = createStep(
  "batch-barcode-import",
  async (input: BatchBarcodeImportInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ])
    const eventBus = tryResolveService(container, [
      Modules.EVENT_BUS,
      "event_bus",
    ])

    const imported: Array<{
      barcode: string
      product_id: string
      variant_id: string | null
      name: string
      provider: string
    }> = []
    const notFound: string[] = []
    const errors: Array<{ barcode: string; error: string }> = []
    const createdBarcodeProductIds: string[] = []
    const createdMedusaProductIds: string[] = []

    const uniqueBarcodes = Array.from(
      new Set(input.barcodes.map((b) => String(b).trim()).filter(Boolean))
    ).slice(0, 100)

    for (const rawBarcode of uniqueBarcodes) {
      try {
        const lookup = await barcodeService.lookupBarcode(rawBarcode, {
          strategy: input.strategy,
        })

        if (!lookup.found && !input.createMissingAsDraft) {
          notFound.push(lookup.barcode)
          continue
        }

        const normalized: NormalizedBarcodeProduct = lookup.product || {
          barcode: lookup.barcode,
          barcode_type: lookup.parsed.type,
          name: `Draft Product ${lookup.barcode}`,
          description: null,
          brand: null,
          manufacturer: null,
          categories: [],
          images: [],
          weight: null,
          weight_unit: null,
          dimensions: null,
          quantity_label: null,
          ingredients: null,
          nutrition: null,
          country_of_origin: null,
          suggested_price: null,
          currency_code: "USD",
          isbn: null,
          authors: [],
          publisher: null,
          published_date: null,
          page_count: null,
          provider: "manual",
          raw_data: {},
        }

        const createPayload = mapToMedusaCreateProduct(normalized, {
          status: input.status || "draft",
          publishImmediately: input.publishImmediately,
          prices: input.prices,
          salesChannelIds: input.salesChannelIds,
          categoryIds: input.categoryIds,
          collectionId: input.collectionId,
        })

        let productId = `prod_${lookup.barcode}`
        let variantId: string | null = `variant_${lookup.barcode}`

        if (
          productService &&
          typeof productService.createProducts === "function"
        ) {
          const created = await productService.createProducts([createPayload])
          const first = Array.isArray(created) ? created[0] : created
          if (first && typeof first === "object" && "id" in first) {
            productId = String((first as { id: string }).id)
            const variants = (first as { variants?: Array<{ id?: string }> })
              .variants
            variantId = variants?.[0]?.id ? String(variants[0].id) : null
            createdMedusaProductIds.push(productId)
          }
        }

        const link = await barcodeService.upsertBarcodeProductLink({
          barcode: lookup.barcode,
          product_id: productId,
          variant_id: variantId,
          provider: normalized.provider,
          product_data: normalized,
          status: "created",
        })
        createdBarcodeProductIds.push(link.id)

        if (eventBus && typeof eventBus.emit === "function") {
          try {
            await eventBus.emit({
              name: BARCODE_EVENTS.PRODUCT_CREATED,
              data: {
                barcode: lookup.barcode,
                product_id: productId,
                variant_id: variantId,
                provider: normalized.provider,
              },
            })
          } catch {
            // Non-fatal
          }
        }

        imported.push({
          barcode: lookup.barcode,
          product_id: productId,
          variant_id: variantId,
          name: normalized.name,
          provider: normalized.provider,
        })
      } catch (err) {
        errors.push({
          barcode: rawBarcode,
          error: err instanceof Error ? err.message : "Import failed",
        })
      }
    }

    return new StepResponse(
      {
        total_requested: uniqueBarcodes.length,
        imported_count: imported.length,
        not_found_count: notFound.length,
        error_count: errors.length,
        imported,
        not_found: notFound,
        errors,
      },
      {
        createdBarcodeProductIds,
        createdMedusaProductIds,
      }
    )
  },
  async (compInput, { container }) => {
    if (!compInput) return
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    if (compInput.createdBarcodeProductIds.length > 0) {
      await barcodeService.deleteBarcodeProducts(
        compInput.createdBarcodeProductIds
      )
    }

    if (compInput.createdMedusaProductIds.length > 0) {
      const productService = tryResolveService(container, [
        Modules.PRODUCT,
        "product",
      ])
      if (productService && typeof productService.deleteProducts === "function") {
        await productService.deleteProducts(compInput.createdMedusaProductIds)
      }
    }
  }
)

export const batchBarcodeImportWorkflow = createWorkflow(
  "batch-barcode-import",
  (input: BatchBarcodeImportInput) => {
    const result = batchBarcodeImportStep(input)
    return new WorkflowResponse(result)
  }
)

export interface BulkGenerateVariantBarcodesInput {
  variant_ids?: string[]
  product_ids?: string[]
  prefix?: string
  overwrite?: boolean
}

const bulkGenerateVariantBarcodesStep = createStep(
  "bulk-generate-variant-barcodes",
  async (input: BulkGenerateVariantBarcodesInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ])

    const generated: Array<{
      variant_id: string
      product_id: string | null
      barcode: string
      ean: string
      upc: string
    }> = []
    const createdTagIds: string[] = []
    const previousVariants: Array<{
      id: string
      barcode: string | null
      ean: string | null
      upc: string | null
    }> = []

    const targetVariants: Array<{
      id: string
      product_id?: string | null
      title?: string | null
      barcode?: string | null
      ean?: string | null
      upc?: string | null
    }> = []

    if (
      productService &&
      typeof productService.listProductVariants === "function"
    ) {
      const filter: Record<string, unknown> = {}
      if (input.variant_ids && input.variant_ids.length > 0) {
        filter.id = input.variant_ids
      }
      if (input.product_ids && input.product_ids.length > 0) {
        filter.product_id = input.product_ids
      }
      const rows = (await productService.listProductVariants(filter, {
        take: 250,
      })) as typeof targetVariants
      if (Array.isArray(rows)) {
        const filteredRows = rows.filter((r) => {
          if (
            input.variant_ids &&
            input.variant_ids.length > 0 &&
            !input.variant_ids.includes(r.id)
          ) {
            return false
          }
          if (
            input.product_ids &&
            input.product_ids.length > 0 &&
            r.product_id &&
            !input.product_ids.includes(r.product_id)
          ) {
            return false
          }
          return true
        })
        targetVariants.push(...filteredRows)
      }
    } else if (input.variant_ids && input.variant_ids.length > 0) {
      for (const vid of input.variant_ids) {
        targetVariants.push({ id: vid, product_id: null })
      }
    }

    let seq = 1
    for (const variant of targetVariants) {
      if (variant.barcode && !input.overwrite) {
        // Ensure a BarcodeTag exists even when variant already has an assigned barcode
        const existingTags = await barcodeService.listBarcodeTags(
          { code: variant.barcode },
          { take: 1 }
        )
        if (!existingTags[0]) {
          const parsedExisting = parseBarcode(variant.barcode)
          const tag = await barcodeService.createOrUpdateBarcodeTag({
            code: variant.barcode,
            target_type: "variant",
            target_id: variant.id,
            product_id: variant.product_id ?? null,
            variant_id: variant.id,
            label: variant.title ?? variant.id,
            symbology:
              parsedExisting.type === "unknown"
                ? "code128"
                : parsedExisting.type,
            scan_action: "view",
          })
          createdTagIds.push(tag.id)
        }
        continue
      }

      previousVariants.push({
        id: variant.id,
        barcode: variant.barcode ?? null,
        ean: variant.ean ?? null,
        upc: variant.upc ?? null,
      })

      const codeInfo = await barcodeService.generateInternalVariantBarcode({
        seed: variant.id,
        sequence: seq++,
        prefix: input.prefix,
      })

      if (
        productService &&
        typeof productService.upsertProductVariants === "function"
      ) {
        await productService.upsertProductVariants([
          {
            id: variant.id,
            barcode: codeInfo.barcode,
            ean: codeInfo.ean,
            upc: codeInfo.upc,
          },
        ])
      }

      const tag = await barcodeService.createOrUpdateBarcodeTag({
        code: codeInfo.barcode,
        target_type: "variant",
        target_id: variant.id,
        product_id: variant.product_id ?? null,
        variant_id: variant.id,
        label: variant.title ?? variant.id,
        symbology: "ean13",
        scan_action: "view",
      })
      createdTagIds.push(tag.id)

      generated.push({
        variant_id: variant.id,
        product_id: variant.product_id ?? null,
        barcode: codeInfo.barcode,
        ean: codeInfo.ean,
        upc: codeInfo.upc,
      })
    }

    return new StepResponse(
      {
        generated_count: generated.length,
        generated,
      },
      {
        createdTagIds,
        previousVariants,
      }
    )
  },
  async (compInput, { container }) => {
    if (!compInput) return
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    if (compInput.createdTagIds.length > 0) {
      await barcodeService.deleteBarcodeTags(compInput.createdTagIds)
    }

    const productService = tryResolveService(container, [
      Modules.PRODUCT,
      "product",
    ])
    if (
      productService &&
      typeof productService.upsertProductVariants === "function" &&
      compInput.previousVariants.length > 0
    ) {
      await productService.upsertProductVariants(compInput.previousVariants)
    }
  }
)

export const bulkGenerateVariantBarcodesWorkflow = createWorkflow(
  "bulk-generate-variant-barcodes",
  (input: BulkGenerateVariantBarcodesInput) => {
    const result = bulkGenerateVariantBarcodesStep(input)
    return new WorkflowResponse(result)
  }
)

export interface GenerateBarcodeTagInput {
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
  upload_svg_to_file_module?: boolean
  metadata?: Record<string, unknown> | null
}

const generateBarcodeTagStep = createStep(
  "generate-barcode-tag",
  async (input: GenerateBarcodeTagInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    const tag = await barcodeService.createOrUpdateBarcodeTag(input)

    if (input.upload_svg_to_file_module && tag.svg_markup) {
      const fileService = tryResolveService(container, [
        Modules.FILE,
        "file",
      ])
      if (fileService && typeof fileService.createFiles === "function") {
        try {
          const uploaded = (await fileService.createFiles([
            {
              filename: `${tag.code}.svg`,
              mimeType: "image/svg+xml",
              content: Buffer.from(tag.svg_markup, "utf-8").toString("base64"),
              access: "public",
            },
          ])) as Array<{ url?: string }>
          if (uploaded?.[0]?.url) {
            const updated = await barcodeService.updateBarcodeTags({
              id: tag.id,
              svg_url: uploaded[0].url,
            })
            return new StepResponse(updated, { tagId: updated.id })
          }
        } catch {
          // Non-fatal if File Module is not configured
        }
      }
    }

    return new StepResponse(tag, { tagId: tag.id })
  },
  async (compInput, { container }) => {
    if (!compInput?.tagId) return
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    await barcodeService.deleteBarcodeTags([compInput.tagId])
  }
)

export const generateBarcodeTagWorkflow = createWorkflow(
  "generate-barcode-tag",
  (input: GenerateBarcodeTagInput) => {
    const tag = generateBarcodeTagStep(input)
    return new WorkflowResponse(tag)
  }
)

export interface ScanInventoryCountInput {
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
}

const scanInventoryCountStep = createStep(
  "scan-inventory-count",
  async (input: ScanInventoryCountInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    const result = await barcodeService.recordCountSessionScan(input)
    return new StepResponse(result, {
      sessionId: input.session_id,
      itemId: result.item.id,
    })
  }
)

export const scanInventoryCountWorkflow = createWorkflow(
  "scan-inventory-count",
  (input: ScanInventoryCountInput) => {
    const result = scanInventoryCountStep(input)
    return new WorkflowResponse(result)
  }
)

export interface ApplyInventoryCountInput {
  session_id: string
  location_id?: string | null
}

const applyInventoryCountStep = createStep(
  "apply-inventory-count",
  async (input: ApplyInventoryCountInput, { container }) => {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService

    const completed = await barcodeService.completeCountSession(
      input.session_id
    )
    const inventoryService = tryResolveService(container, [
      Modules.INVENTORY,
      "inventory",
    ])

    const adjustments: Array<{
      barcode: string
      variant_id: string | null
      expected_quantity: number
      counted_quantity: number
      variance: number
      applied_to_inventory_module: boolean
    }> = []

    const locationId =
      input.location_id || completed.session.location_id || null

    for (const item of completed.items) {
      const variance = Number(item.variance || 0)
      let applied = false

      if (
        variance !== 0 &&
        locationId &&
        item.sku &&
        inventoryService &&
        typeof inventoryService.listInventoryItems === "function" &&
        typeof inventoryService.updateInventoryLevels === "function"
      ) {
        try {
          const invItems = (await inventoryService.listInventoryItems(
            { sku: item.sku },
            { take: 1 }
          )) as Array<{ id: string }>
          if (invItems?.[0]?.id) {
            await inventoryService.updateInventoryLevels([
              {
                inventory_item_id: invItems[0].id,
                location_id: locationId,
                stocked_quantity: Number(item.counted_quantity || 0),
              },
            ])
            applied = true
          }
        } catch {
          applied = false
        }
      }

      adjustments.push({
        barcode: item.barcode,
        variant_id: item.variant_id ?? null,
        expected_quantity: Number(item.expected_quantity || 0),
        counted_quantity: Number(item.counted_quantity || 0),
        variance,
        applied_to_inventory_module: applied,
      })
    }

    return new StepResponse(
      {
        session: completed.session,
        adjustments_count: adjustments.length,
        adjustments,
      },
      { sessionId: input.session_id }
    )
  },
  async (compInput, { container }) => {
    if (!compInput?.sessionId) return
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    await barcodeService.updateBarcodeCountSessions({
      id: compInput.sessionId,
      status: "in_progress",
      completed_at: null,
    })
  }
)

export const applyInventoryCountWorkflow = createWorkflow(
  "apply-inventory-count",
  (input: ApplyInventoryCountInput) => {
    const result = applyInventoryCountStep(input)
    return new WorkflowResponse(result)
  }
)
