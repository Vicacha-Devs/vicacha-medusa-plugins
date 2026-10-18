import type {
  OfflinePosEnqueueInput,
  OfflinePosReplayResult,
} from "../types"
import type { OdooModuleService } from "../service"

export async function enqueueOfflinePosTransaction(this: OdooModuleService, input: OfflinePosEnqueueInput) {
  const existing = await this.listOfflinePosTransactions(
    { external_transaction_id: input.externalTransactionId },
    { take: 1 }
  )
  if (existing?.[0]) {
    return existing[0]
  }

  return this.createOfflinePosTransactions({
    external_transaction_id: input.externalTransactionId,
    device_id: input.deviceId ?? null,
    session_id: input.sessionId ?? null,
    pos_location_id: input.posLocationId ?? null,
    cart_id: input.cartId ?? null,
    payment_method: input.paymentMethod ?? null,
    customer_id: input.customerId ?? null,
    customer_email: input.customerEmail ?? null,
    currency: (input.currency ?? "USD").toUpperCase(),
    total_cents: input.totalCents,
    discount_cents: input.discountCents ?? 0,
    items: { lines: input.items },
    status: "pending",
    replay_attempt_count: 0,
    metadata: input.metadata ?? null,
  })
}

export async function replayOfflinePosTransaction(this: OdooModuleService, params: {
  id: string
  syncToOdoo?: boolean
  onCreateMedusaOrder?: (txn: Record<string, unknown>) => Promise<string>
}): Promise<OfflinePosReplayResult> {
  const rows = await this.listOfflinePosTransactions(
    { id: params.id },
    { take: 1 }
  )
  const txn = rows?.[0]
  if (!txn) {
    return {
      ok: false,
      transactionId: params.id,
      message: `Offline POS transaction ${params.id} not found.`,
    }
  }

  if (txn.status === "replayed") {
    return {
      ok: true,
      transactionId: txn.id,
      medusaOrderId: txn.medusa_order_id ?? undefined,
      odooOrderId: txn.odoo_order_id ?? null,
      message: "Transaction already replayed.",
    }
  }

  try {
    const medusaOrderId = params.onCreateMedusaOrder
      ? await params.onCreateMedusaOrder(txn)
      : `order_pos_${txn.external_transaction_id}`

    let odooOrderId: number | null = null
    let odooSyncError: string | null = null
    if (params.syncToOdoo !== false) {
      const itemsObj = txn.items as {
        lines?: Array<{
          variantId: string
          sku?: string
          title?: string
          quantity: number
          unitPriceCents: number
        }>
      }
      const lines = itemsObj?.lines ?? []
      const orderSync = await this.syncOrderToOdoo({
        order: {
          id: medusaOrderId,
          email:
            txn.customer_email ||
            `pos-${txn.external_transaction_id}@example.com`,
          currency_code: (txn.currency || "USD").toLowerCase(),
          payment_status: "captured",
          fulfillment_status: "fulfilled",
          items: lines.map((l) => ({
            title: l.title || l.sku || l.variantId,
            quantity: l.quantity,
            unit_price: l.unitPriceCents / 100,
            variant_sku: l.sku || l.variantId,
          })),
        },
        manual: true,
      })
      if (orderSync.ok && orderSync.odooOrderId) {
        odooOrderId = orderSync.odooOrderId
      } else if (!orderSync.ok) {
        odooSyncError = orderSync.message
      }
    }

    await this.updateOfflinePosTransactions({
      id: txn.id,
      status: "replayed",
      medusa_order_id: medusaOrderId,
      odoo_order_id: odooOrderId,
      replayed_at: new Date(),
      last_replay_at: new Date(),
      replay_error: odooSyncError,
    })

    return {
      ok: true,
      transactionId: txn.id,
      medusaOrderId,
      odooOrderId,
      message: `Replayed POS transaction ${txn.external_transaction_id} → order ${medusaOrderId}.`,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await this.updateOfflinePosTransactions({
      id: txn.id,
      status: "failed",
      replay_error: msg,
      replay_attempt_count: (txn.replay_attempt_count ?? 0) + 1,
      last_replay_at: new Date(),
    })
    return {
      ok: false,
      transactionId: txn.id,
      message: msg,
    }
  }
}
