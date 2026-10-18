import {
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  OdooOrderSyncResult,
  OdooOrderSyncSettings,
} from "../types"
import type { OdooModuleService } from "../service"

const PAID_STATUSES = new Set([
  "captured",
  "partially_captured",
  "paid",
  "partially_paid",
])

const FULFILLED_STATUSES = new Set([
  "fulfilled",
  "partially_fulfilled",
  "delivered",
  "partially_delivered",
])

export async function syncOrderToOdoo(this: OdooModuleService, params: {
  order: {
    id: string
    email: string
    currency_code?: string
    payment_status?: string
    fulfillment_status?: string
    metadata?: Record<string, unknown> | null
    customer?: {
      id?: string
      first_name?: string | null
      last_name?: string | null
      email?: string | null
      phone?: string | null
    } | null
    items: Array<{
      title: string
      quantity: number
      unit_price: number
      variant_sku?: string | null
    }>
  }
  manual?: boolean
}): Promise<OdooOrderSyncResult> {
  const started = Date.now()
  const settings =
    await this.getSectionSettings<OdooOrderSyncSettings>("orders")
  const order = params.order

  if (!settings.orderSync && !params.manual) {
    return {
      ok: true,
      skipped: true,
      orderId: order.id,
      message: "Order sync is disabled.",
    }
  }

  const existingMappedId =
    (order.metadata?.odoo_order_id != null
      ? Number(order.metadata.odoo_order_id)
      : null) ?? (await this.getOdooId("order", order.id))

  if (existingMappedId) {
    return {
      ok: true,
      skipped: true,
      orderId: order.id,
      odooOrderId: existingMappedId,
      message: `Already synced to Odoo sale.order #${existingMappedId}.`,
    }
  }

  try {
    const client = await this.getOdooClient()

    // Check if order already exists in Odoo by client_order_ref
    const remoteExisting = await client.getOrderByMedusaId(order.id)
    if (remoteExisting) {
      await this.upsertMapping({
        entityType: "order",
        medusaId: order.id,
        odooId: remoteExisting.id,
        direction: "medusa_to_odoo",
        odooModel: "sale.order",
      })
      return {
        ok: true,
        skipped: true,
        orderId: order.id,
        odooOrderId: remoteExisting.id,
        message: `Matched existing Odoo sale.order #${remoteExisting.id}.`,
      }
    }

    // 1. Resolve or create customer in Odoo
    const customerEmail =
      order.customer?.email || order.email || `guest-${order.id}@example.com`
    const customerName =
      [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || customerEmail

    const partnerRes = await client.upsertCustomer(
      order.customer?.id || order.id,
      {
        name: customerName,
        email: customerEmail,
        ...(order.customer?.phone ? { phone: order.customer.phone } : {}),
      }
    )

    // 2. Resolve each line item SKU to Odoo product.product
    const orderLines: Array<{
      product_id: number
      product_uom_qty: number
      price_unit: number
      name: string
    }> = []
    for (const item of order.items || []) {
      const sku = (item.variant_sku || "").trim()
      if (!sku) {
        if (settings.failOnUnmatchedSku !== false) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Order line "${item.title}" has no SKU; cannot match Odoo product.`
          )
        }
        continue
      }

      const odooProduct = await client.findProductByBarcodeOrSku(sku)
      if (!odooProduct) {
        if (settings.failOnUnmatchedSku !== false) {
          throw new MedusaError(
            MedusaError.Types.NOT_FOUND,
            `Order line SKU "${sku}" not found in Odoo product.product.`
          )
        }
        continue
      }

      orderLines.push({
        product_id: odooProduct.id,
        product_uom_qty: item.quantity,
        price_unit: item.unit_price,
        name: item.title,
      })
    }

    if (!orderLines.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Order ${order.id} has no matchable line items.`
      )
    }

    // 3. Create sale.order + lines
    const odooOrderId = await client.createSaleOrder(
      {
        partner_id: partnerRes.id,
        client_order_ref: order.id,
      },
      orderLines
    )

    if (settings.confirmOrderInOdoo !== false) {
      await client.confirmSaleOrder(odooOrderId)
    }

    // 4. Optional Invoice & Payment creation
    const isPaid = PAID_STATUSES.has(order.payment_status ?? "")
    const isFulfilled = FULFILLED_STATUSES.has(order.fulfillment_status ?? "")
    const shouldInvoice =
      Boolean(settings.exportInvoice) &&
      (!settings.invoiceMode ||
        settings.invoiceMode === "all" ||
        (settings.invoiceMode === "paid" && isPaid) ||
        (settings.invoiceMode === "fulfilled" && isFulfilled))

    let odooInvoiceId: number | null = null
    let odooPaymentId: number | null = null

    if (shouldInvoice) {
      odooInvoiceId = await client.createAndPostInvoice({
        partnerId: partnerRes.id,
        orderId: odooOrderId,
        originName: order.id,
        lines: orderLines,
      })

      if (settings.createPayment || settings.markInvoicePaid) {
        odooPaymentId = await client.registerInvoicePayment({
          invoiceId: odooInvoiceId,
          journalId: settings.paymentJournalId ?? null,
        })
      }
    }

    await this.upsertMapping({
      entityType: "order",
      medusaId: order.id,
      odooId: odooOrderId,
      direction: "medusa_to_odoo",
      odooModel: "sale.order",
      metadata: {
        odooInvoiceId,
        odooPaymentId,
      },
    })

    await this.logSync({
      entityType: "order",
      direction: "medusa_to_odoo",
      trigger: params.manual ? "manual" : "event",
      status: "success",
      created: 1,
      durationMs: Date.now() - started,
      message: `Synced order ${order.id} → Odoo sale.order #${odooOrderId}${odooInvoiceId ? ` (invoice #${odooInvoiceId})` : ""}.`,
    })

    return {
      ok: true,
      orderId: order.id,
      odooOrderId,
      odooInvoiceId,
      odooPaymentId,
      message: `Synced order ${order.id} → Odoo sale.order #${odooOrderId}.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await this.recordFailure({
      entityType: "order",
      medusaId: order.id,
      direction: "medusa_to_odoo",
      trigger: params.manual ? "manual" : "event",
      errorMessage: msg,
    })
    await this.logSync({
      entityType: "order",
      direction: "medusa_to_odoo",
      trigger: params.manual ? "manual" : "event",
      status: "failed",
      failed: 1,
      durationMs: Date.now() - started,
      message: `Order ${order.id}: ${msg}`,
    })
    return {
      ok: false,
      orderId: order.id,
      message: msg,
    }
  }
}

/**
 * Cancel a synced sale.order in Odoo when the corresponding Medusa order is cancelled.
 */
export async function cancelOrderInOdoo(
  this: OdooModuleService,
  medusaOrderId: string,
  trigger = "event"
): Promise<{ ok: boolean; odooOrderId: number | null; message: string }> {
  const started = Date.now()
  const odooOrderId = await this.getOdooId("order", medusaOrderId)
  if (!odooOrderId) {
    return {
      ok: true,
      odooOrderId: null,
      message: `Order ${medusaOrderId} is not mapped in Odoo; skipping cancellation.`,
    }
  }

  try {
    const client = await this.getOdooClient()
    await client.rpc("sale.order", "action_cancel", [[odooOrderId]])

    const durationMs = Date.now() - started
    await this.logSync({
      entityType: "order",
      direction: "medusa_to_odoo",
      trigger,
      status: "success",
      updated: 1,
      durationMs,
      message: `Cancelled Odoo sale.order #${odooOrderId} for Medusa order ${medusaOrderId}`,
    })

    return {
      ok: true,
      odooOrderId,
      message: `Cancelled Odoo sale.order #${odooOrderId} for Medusa order ${medusaOrderId}`,
    }
  } catch (err) {
    const durationMs = Date.now() - started
    const msg = err instanceof Error ? err.message : String(err)
    await this.logSync({
      entityType: "order",
      direction: "medusa_to_odoo",
      trigger,
      status: "failed",
      failed: 1,
      durationMs,
      message: `Failed to cancel Odoo sale.order #${odooOrderId}: ${msg}`,
    })
    return {
      ok: false,
      odooOrderId,
      message: msg,
    }
  }
}
