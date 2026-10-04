import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BoldHttpClient } from "../../services/bold-client"
import { BoldBaseOptions } from "@payment-bold/types"

export interface GetTerminalsStepInput {
  options?: any
}

export const getTerminalsStep = createStep(
  "get-terminals-step",
  async (_: GetTerminalsStepInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    
    // Resolve options from container or fallback
    const boldOptions = container.resolve<BoldBaseOptions>("boldPaymentOptions", {
      allowUnregistered: true,
    }) || {}

    const client = new BoldHttpClient(boldOptions, logger)
    const terminals = await client.getTerminals()

    return new StepResponse(terminals)
  }
)