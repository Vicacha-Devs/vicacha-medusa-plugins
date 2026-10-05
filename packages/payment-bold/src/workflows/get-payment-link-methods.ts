import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getPaymentLinkMethodsStep } from "./steps/get-payment-link-methods"

export const getPaymentLinkMethodsWorkflow = createWorkflow(
  "get-payment-link-methods",
  () => {
    const { paymentMethods } = getPaymentLinkMethodsStep()
    return new WorkflowResponse(paymentMethods)
  }
)
