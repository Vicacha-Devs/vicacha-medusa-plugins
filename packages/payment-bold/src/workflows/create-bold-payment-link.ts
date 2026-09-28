import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createBoldLinkStep, CreateBoldLinkStepInput } from "./steps/create-bold-link"

export const createBoldPaymentLinkWorkflow = createWorkflow(
  "create-bold-payment-link",
  (input: CreateBoldLinkStepInput) => {
    const result = createBoldLinkStep(input)
    return new WorkflowResponse(result)
  }
)