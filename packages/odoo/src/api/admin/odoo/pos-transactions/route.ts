import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OfflinePosItemInput,
} from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const status =
    typeof req.query.status === "string" ? req.query.status : undefined
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status

  const transactions = await odooService.listOfflinePosTransactions(filters, {
    take: 100,
  })
  res.json({ transactions })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as {
    action: "enqueue" | "replay"
    id?: string
    externalTransactionId?: string
    customerId?: string
    customerEmail?: string
    currency?: string
    totalCents?: number
    discountCents?: number
    items?: OfflinePosItemInput[]
    syncToOdoo?: boolean
  }

  if (body.action === "replay") {
    if (!body.id) {
      res.status(400).json({ error: "Transaction id is required for replay." })
      return
    }
    const result = await odooService.replayOfflinePosTransaction({
      id: body.id,
      syncToOdoo: body.syncToOdoo,
    })
    res.status(result.ok ? 200 : 400).json(result)
    return
  }

  if (!body.externalTransactionId || !Array.isArray(body.items)) {
    res.status(400).json({
      error: "externalTransactionId and items are required to enqueue POS transaction.",
    })
    return
  }

  const transaction = await odooService.enqueueOfflinePosTransaction({
    externalTransactionId: body.externalTransactionId,
    customerId: body.customerId,
    customerEmail: body.customerEmail,
    currency: body.currency,
    totalCents: body.totalCents ?? 0,
    discountCents: body.discountCents ?? 0,
    items: body.items,
  })

  res.json({ ok: true, transaction })
}
