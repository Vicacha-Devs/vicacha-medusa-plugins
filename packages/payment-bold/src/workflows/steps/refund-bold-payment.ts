// plugins/packages/payment-bold/src/workflows/steps/refund-bold-payment.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { refundPaymentWorkflow } from "@medusajs/medusa/core-flows"

export interface RefundBoldPaymentStepInput {
  paymentId: string
  amount: number
  note?: string
}

export const refundBoldPaymentStep = createStep(
  "refund-bold-payment-step",
  async (input: RefundBoldPaymentStepInput, { container }) => {
    // Execute Medusa v2 Core Refund Payment Workflow
    const { result } = await refundPaymentWorkflow(container).run({
      input: {
        payment_id: input.paymentId,
        amount: input.amount,
        note: input.note,
      },
    })

    return new StepResponse(
      { refund: result },
      { paymentId: input.paymentId, refundId: result?.id }
    )
  }
)
