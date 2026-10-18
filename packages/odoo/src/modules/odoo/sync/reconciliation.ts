import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type {
  OdooReconciliationDetail,
  OdooReconciliationResult,
  OdooReconciliationSettings,
} from "../types"
import type { OdooModuleService } from "../service"
import { errorMessage } from "../utils/errors"

export async function resolveConflict(this: OdooModuleService, params: {
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

export async function reconcileInventory(this: OdooModuleService, params?: {
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

  const errorMessages: string[] = []
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
      } catch (err) {
        result.errors++
        const msg = errorMessage(err)
        errorMessages.push(`${item.sku}: ${msg}`)
        await this.recordFailure({
          entityType: "inventory",
          medusaId: item.variantId,
          direction: "bidirectional",
          trigger: params?.triggeredBy ?? "manual",
          errorMessage: msg,
        })
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
      details: {
        items: result.details,
        ...(errorMessages.length ? { errors: errorMessages } : {}),
      },
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
      details: { items: result.details, errors: [errorMessage(err)] },
      completed_at: new Date(),
    })
    return result
  }
}
