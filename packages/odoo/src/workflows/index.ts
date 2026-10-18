import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type OdooModuleService from "../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooOrderSyncResult,
  type OdooReconciliationResult,
  type OdooSyncDirection,
  type OdooSyncResult,
  type OfflinePosReplayResult,
} from "../modules/odoo/types"

export async function executeOrderSyncToOdoo(
  container: { resolve: (key: string) => unknown },
  input: { orderId: string; manual?: boolean }
): Promise<OdooOrderSyncResult> {
  const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: Record<string, unknown>) => Promise<{
      data: Array<Record<string, unknown>>
    }>
  }

  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "email",
      "currency_code",
      "payment_status",
      "fulfillment_status",
      "metadata",
      "customer.id",
      "customer.first_name",
      "customer.last_name",
      "customer.email",
      "customer.phone",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.variant_sku",
    ],
    filters: { id: input.orderId },
  })

  const rawOrder = data?.[0]
  if (!rawOrder) {
    return {
      ok: false,
      orderId: input.orderId,
      message: `Order ${input.orderId} not found.`,
    }
  }

  const customer = rawOrder.customer as Record<string, unknown> | undefined
  const items = Array.isArray(rawOrder.items)
    ? (rawOrder.items as Array<Record<string, unknown>>)
    : []

  const syncResult = await odooService.syncOrderToOdoo({
    order: {
      id: String(rawOrder.id),
      email: String(rawOrder.email ?? ""),
      currency_code:
        typeof rawOrder.currency_code === "string"
          ? rawOrder.currency_code
          : "usd",
      payment_status:
        typeof rawOrder.payment_status === "string"
          ? rawOrder.payment_status
          : undefined,
      fulfillment_status:
        typeof rawOrder.fulfillment_status === "string"
          ? rawOrder.fulfillment_status
          : undefined,
      metadata: (rawOrder.metadata as Record<string, unknown>) ?? null,
      customer: customer
        ? {
            id: typeof customer.id === "string" ? customer.id : undefined,
            first_name:
              typeof customer.first_name === "string"
                ? customer.first_name
                : null,
            last_name:
              typeof customer.last_name === "string"
                ? customer.last_name
                : null,
            email: typeof customer.email === "string" ? customer.email : null,
            phone: typeof customer.phone === "string" ? customer.phone : null,
          }
        : null,
      items: items.map((it) => ({
        title: String(it.title ?? "Item"),
        quantity: Number(it.quantity ?? 1),
        unit_price: Number(it.unit_price ?? 0),
        variant_sku:
          typeof it.variant_sku === "string" ? it.variant_sku : null,
      })),
    },
    manual: input.manual,
  })

  if (syncResult.ok && syncResult.odooOrderId) {
    try {
      const orderModule = container.resolve(Modules.ORDER) as {
        updateOrders?: (data: Array<Record<string, unknown>>) => Promise<unknown>
      }
      if (orderModule?.updateOrders) {
        const existingMetadata =
          (rawOrder.metadata as Record<string, unknown>) ?? {}
        await orderModule.updateOrders([
          {
            id: String(rawOrder.id),
            metadata: {
              ...existingMetadata,
              odoo_order_id: syncResult.odooOrderId,
              ...(syncResult.odooInvoiceId
                ? { odoo_invoice_id: syncResult.odooInvoiceId }
                : {}),
            },
          },
        ])
      }
    } catch {
      // Non-critical metadata write back
    }
  }

  return syncResult
}

const syncProductsStep = createStep(
  "sync-products",
  async (
    input: { direction?: OdooSyncDirection; trigger?: string },
    { container }
  ) => {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const res = await odooService.syncProducts(
      container,
      input.direction,
      input.trigger ?? "workflow"
    )
    return new StepResponse(res, { logId: res.logId })
  }
)

export const syncProductsWithOdooWorkflow = createWorkflow(
  "sync-products-with-odoo",
  (input: { direction?: OdooSyncDirection; trigger?: string }) => {
    const res = syncProductsStep(input)
    return new WorkflowResponse(res)
  }
)

const syncInventoryStep = createStep(
  "sync-inventory",
  async (
    input: { direction?: OdooSyncDirection; trigger?: string },
    { container }
  ) => {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const res = await odooService.syncInventory(
      container,
      input.direction,
      input.trigger ?? "workflow"
    )
    return new StepResponse(res, { logId: res.logId })
  }
)

export const syncInventoryWithOdooWorkflow = createWorkflow(
  "sync-inventory-with-odoo",
  (input: { direction?: OdooSyncDirection; trigger?: string }) => {
    const res = syncInventoryStep(input)
    return new WorkflowResponse(res)
  }
)

const syncOrderStep = createStep(
  "sync-order",
  async (
    input: { orderId: string; manual?: boolean },
    { container }
  ) => {
    const res = await executeOrderSyncToOdoo(container, input)
    return new StepResponse(res, {
      orderId: input.orderId,
      odooOrderId: res.odooOrderId,
    })
  }
)

export const syncOrderToOdooWorkflow = createWorkflow(
  "sync-order-to-odoo",
  (input: { orderId: string; manual?: boolean }) => {
    const res = syncOrderStep(input)
    return new WorkflowResponse(res)
  }
)

const syncCustomersStep = createStep(
  "sync-customers",
  async (
    input: { direction?: OdooSyncDirection; trigger?: string },
    { container }
  ) => {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const res = await odooService.syncCustomers({
      scope: container,
      directionOverride: input.direction,
      trigger: input.trigger ?? "workflow",
    })
    return new StepResponse(res, { logId: res.logId })
  }
)

export const syncCustomersWithOdooWorkflow = createWorkflow(
  "sync-customers-with-odoo",
  (input: { direction?: OdooSyncDirection; trigger?: string }) => {
    const res = syncCustomersStep(input)
    return new WorkflowResponse(res)
  }
)

const reconcileInventoryStep = createStep(
  "reconcile-inventory",
  async (
    input: {
      strategy?: "odoo_wins" | "medusa_wins" | "manual_conflict"
      driftThreshold?: number
      triggeredBy?: string
    },
    { container }
  ) => {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const res: OdooReconciliationResult = await odooService.reconcileInventory({
      scope: container,
      strategyOverride: input.strategy,
      driftThresholdOverride: input.driftThreshold,
      triggeredBy: input.triggeredBy ?? "workflow",
    })
    return new StepResponse(res)
  }
)

export const reconcileOdooInventoryWorkflow = createWorkflow(
  "reconcile-odoo-inventory",
  (input: {
    strategy?: "odoo_wins" | "medusa_wins" | "manual_conflict"
    driftThreshold?: number
    triggeredBy?: string
  }) => {
    const res = reconcileInventoryStep(input)
    return new WorkflowResponse(res)
  }
)

const replayPosTransactionStep = createStep(
  "replay-pos-transaction",
  async (input: { id: string; syncToOdoo?: boolean }, { container }) => {
    const odooService = container.resolve(ODOO_MODULE) as OdooModuleService
    const res: OfflinePosReplayResult =
      await odooService.replayOfflinePosTransaction({
        id: input.id,
        syncToOdoo: input.syncToOdoo,
      })
    return new StepResponse(res)
  }
)

export const replayOfflinePosTransactionWorkflow = createWorkflow(
  "replay-offline-pos-transaction",
  (input: { id: string; syncToOdoo?: boolean }) => {
    const res = replayPosTransactionStep(input)
    return new WorkflowResponse(res)
  }
)

export type {
  OdooOrderSyncResult,
  OdooReconciliationResult,
  OdooSyncResult,
  OfflinePosReplayResult,
}
