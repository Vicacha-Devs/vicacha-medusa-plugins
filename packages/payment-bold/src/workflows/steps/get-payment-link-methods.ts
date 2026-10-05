import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BoldBaseOptions } from "@payment-bold/types"

import { BoldHttpClient } from "../../services/bold-client"

export const getPaymentLinkMethodsStep = createStep(
  "get-payment-link-methods-step",
  async (_, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

    const boldOptions = container.resolve<BoldBaseOptions>("boldPaymentOptions", {
      allowUnregistered: true,
    }) || {}

    const client = new BoldHttpClient(boldOptions, logger)
    const paymentMethods = await client.getAvailablePaymentLinkPaymentMethods()

    return new StepResponse({ paymentMethods })
  }
)
