import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getProviderOptionsFromContainer } from "@payment-bold/lib/get-provider-options"
import { BoldHttpClient } from "@payment-bold/services/bold-client"

export const getPaymentLinkMethodsStep = createStep(
  "get-payment-link-methods-step",
  async (_, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const boldProviderOptions = getProviderOptionsFromContainer(container)

    const client = new BoldHttpClient(boldProviderOptions, logger)
    const paymentMethods = await client.getAvailablePaymentLinkPaymentMethods()

    return new StepResponse({ paymentMethods })
  }
)
