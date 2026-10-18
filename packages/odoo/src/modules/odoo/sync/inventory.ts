import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type {
  OdooInventorySyncSettings,
  OdooSyncDirection,
  OdooSyncResult,
} from "../types"
import type { OdooModuleService } from "../service"
import { errorMessage } from "../utils/errors"

export async function importInventoryFromOdoo(
  this: OdooModuleService,
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
          .catch(() => ({ data: [] as Array<{ id: string; sku?: string }> }))
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
    const errors: string[] = []

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
          if (!inventoryModule?.listInventoryLevels) {
            throw new MedusaError(
              MedusaError.Types.UNEXPECTED_STATE,
              "Medusa inventory module is unavailable in the given scope."
            )
          }
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
          updated++
        } catch (err) {
          failed++
          errors.push(`${lvl.sku}@${map.medusaLocationId}: ${errorMessage(err)}`)
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
      errorDetails: errors.length ? { errors } : null,
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
      errors: errors.length ? errors : undefined,
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

export async function exportInventoryToOdoo(
  this: OdooModuleService,
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

export async function syncInventory(
  this: OdooModuleService,
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
