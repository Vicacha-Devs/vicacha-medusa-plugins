import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BoldBaseOptions, BoldPaymentMethod } from "@payment-bold/types"

import { BoldHttpClient } from "../../services/bold-client"

export const getBoldPaymentMethodsStep = createStep(
  "get-bold-payment-methods-step",
  async (_, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const boldOptions = container.resolve<BoldBaseOptions>("boldPaymentOptions", {
      allowUnregistered: true,
    }) || {}

    const client = new BoldHttpClient(boldOptions, logger)
    const paymentMethods: Array<BoldPaymentMethod> = await client.getAvailablePaymentMethods()

    return new StepResponse({ paymentMethods })
  }
)