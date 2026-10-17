import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooReconciliationStrategy,
  type OdooSyncDirection,
} from "../../../../../modules/odoo/types"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entity = req.params.entity
  const body = (req.validatedBody ?? {}) as {
    direction?: OdooSyncDirection
    strategy?: OdooReconciliationStrategy
    driftThreshold?: number
  }
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService

  if (entity === "products" || entity === "product") {
    const result = await odooService.syncProducts(
      req.scope,
      body.direction,
      "manual"
    )
    res.json(result)
    return
  }

  if (entity === "inventory") {
    const result = await odooService.syncInventory(
      req.scope,
      body.direction,
      "manual"
    )
    res.json(result)
    return
  }

  if (entity === "customers" || entity === "customer") {
    const result = await odooService.syncCustomers({
      directionOverride: body.direction,
      trigger: "manual",
    })
    res.json(result)
    return
  }

  if (entity === "reconciliation") {
    const result = await odooService.reconcileInventory({
      strategyOverride: body.strategy,
      driftThresholdOverride: body.driftThreshold,
      triggeredBy: "manual",
    })
    res.json(result)
    return
  }

  if (entity === "all") {
    const products = await odooService.syncProducts(
      req.scope,
      body.direction,
      "manual"
    )
    const inventory = await odooService.syncInventory(
      req.scope,
      body.direction,
      "manual"
    )
    const customers = await odooService.syncCustomers({
      directionOverride: body.direction,
      trigger: "manual",
    })
    res.json({
      ok: products.ok && inventory.ok && customers.ok,
      entity: "all",
      direction: body.direction ?? "bidirectional",
      created: products.created + inventory.created + customers.created,
      updated: products.updated + inventory.updated + customers.updated,
      skipped: products.skipped + inventory.skipped + customers.skipped,
      failed: products.failed + inventory.failed + customers.failed,
      durationMs:
        products.durationMs + inventory.durationMs + customers.durationMs,
      message: `${products.message} | ${inventory.message} | ${customers.message}`,
    })
    return
  }

  res.status(400).json({
    error: `Unsupported sync entity "${entity}". Expected products, inventory, customers, reconciliation, or all.`,
  })
}
