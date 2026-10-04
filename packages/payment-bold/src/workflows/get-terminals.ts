import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getTerminalsStep } from "./steps/get-terminals"

export const getTerminalsWorkflow = createWorkflow(
  "get-terminals-workflow",
  () => {
    const terminals = getTerminalsStep({})
    return new WorkflowResponse(terminals)
  }
)