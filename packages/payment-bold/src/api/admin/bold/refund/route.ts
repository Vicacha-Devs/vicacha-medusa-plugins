import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { refundBoldPaymentWorkflow } from "@payment-bold/workflows/create-bold-refund";

export const POST = async (
  req: AuthenticatedMedusaRequest<{ payment_id: string; amount: number; note?: string }>,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { payment_id, amount, note } = req.body || {}

  if (!payment_id || !amount) {
    return res.status(400).json({ message: "payment_id and amount are required" })
  }

  try {
    const { result } = await refundBoldPaymentWorkflow(req.scope).run({
      input: {
        paymentId: payment_id,
        amount: Number(amount),
        note,
      },
    })

    return res.json(result)
  } catch (err: any) {
    logger.error(`[Bold Refund Route] Error executing refund workflow: ${err.message}`, err)
    return res.status(500).json({
      message: err.message || "Failed to process refund",
    })
  }
}
