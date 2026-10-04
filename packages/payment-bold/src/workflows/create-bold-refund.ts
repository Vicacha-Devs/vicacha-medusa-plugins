import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { refundBoldPaymentStep, RefundBoldPaymentStepInput } from "./steps/refund-bold-payment"

export const refundBoldPaymentWorkflow = createWorkflow(
  "refund-bold-payment-workflow",
  (input: RefundBoldPaymentStepInput) => {
    const result = refundBoldPaymentStep(input)
    return new WorkflowResponse(result)
  }
)