import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type {
  OdooProductSyncSettings,
  OdooSyncDirection,
  OdooSyncResult,
} from "../types"
import type { OdooModuleService } from "../service"
import {
  computeExternalChecksum,
  slugifyHandle,
} from "../utils/security"

export async function importProductsFromOdoo(
  this: OdooModuleService,
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

export async function exportProductsToOdoo(
  this: OdooModuleService,
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

export async function syncProducts(
  this: OdooModuleService,
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

export async function archiveProductInOdoo(
  this: OdooModuleService,
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
