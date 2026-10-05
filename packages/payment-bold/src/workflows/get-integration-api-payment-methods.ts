import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getBoldPaymentMethodsStep } from "./steps/get-bold-payment-methods"

export const getIntegrationApiPaymentMethodsWorkflow = createWorkflow(
  "get-integration-api-payment-methods",
  () => {
    const { paymentMethods } = getBoldPaymentMethodsStep()
    return new WorkflowResponse(paymentMethods)
  }
)
