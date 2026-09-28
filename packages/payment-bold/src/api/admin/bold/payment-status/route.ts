import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IPaymentModuleService } from "@medusajs/framework/types"

/**
 * GET /admin/bold/payment-status
 * 
 * Fetches the status and metadata of a payment session using Medusa v2's Payment Module.
 * 
 * Query Parameters:
 * - paymentSessionId / payment_session_id: The unique ID of the Medusa payment session.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT)

  const paymentSessionId = (req.query.paymentSessionId || req.query.payment_session_id) as string

  if (!paymentSessionId) {
    res.status(400).json({ message: "Missing required 'paymentSessionId' query parameter." })
    return
  }

  try {
    // In Medusa v2, payment session details are retrieved directly from the Payment Module
    const paymentSession = await paymentModule.retrievePaymentSession(paymentSessionId)

    res.status(200).json({
      id: paymentSession.id,
      status: paymentSession.status, // e.g., 'authorized', 'captured', 'pending', 'canceled'
      amount: paymentSession.amount,
      currency_code: paymentSession.currency_code,
      data: paymentSession.data,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to retrieve payment session status" })
  }
}