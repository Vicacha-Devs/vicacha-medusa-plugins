import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getBoldPaymentMethodsStep } from "./steps/get-bold-payment-methods"

export const getBoldPaymentMethodsWorkflow = createWorkflow(
  "get-bold-payment-methods",
  function () {
    const result = getBoldPaymentMethodsStep()
    return new WorkflowResponse(result)
  }
)