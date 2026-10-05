import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BoldIntegrationAPIPaymentMethod } from "@payment-bold/types"
import { getProviderOptionsFromContainer } from "@payment-bold/lib/get-provider-options"
import { BoldHttpClient } from "@payment-bold/services/bold-client"


export const getBoldPaymentMethodsStep = createStep(
  "get-bold-payment-methods-step",
  async (_, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const boldProviderOptions = getProviderOptionsFromContainer(container)

    const client = new BoldHttpClient(boldProviderOptions, logger)
    const paymentMethods: Array<BoldIntegrationAPIPaymentMethod> = await client.getAvailableIntegrationApiPaymentMethods()

    return new StepResponse({ paymentMethods })
  }
)