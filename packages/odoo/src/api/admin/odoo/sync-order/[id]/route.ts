import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { executeOrderSyncToOdoo } from "../../../../../workflows"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const orderId = req.params.id
  if (!orderId) {
    res.status(400).json({ error: "Order ID is required." })
    return
  }

  const result = await executeOrderSyncToOdoo(req.scope, {
    orderId,
    manual: true,
  })
  res.status(result.ok ? 200 : 400).json(result)
}
