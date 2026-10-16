import type { Logger } from "@medusajs/medusa"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getProviderOptionsFromContainer } from "@payment-bold/lib/get-provider-options"
import { BoldHttpClient } from "@payment-bold/services/bold-client"

export const getTerminalsStep = createStep(
  "get-terminals",
  async (_, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    
    // Resolve options from container or fallback
    const boldProviderOptions = getProviderOptionsFromContainer(container)

    const client = new BoldHttpClient(boldProviderOptions, logger)
    const terminals = await client.getTerminals()

    return new StepResponse(terminals)
  }
)