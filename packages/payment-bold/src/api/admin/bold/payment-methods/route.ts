import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { getBoldPaymentMethodsWorkflow } from "../../../../workflows/get-bold-payment-methods"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await getBoldPaymentMethodsWorkflow(req.scope).run()
    return res.json(result)
  } catch (err: any) {
    logger.error(`[Bold Payment Methods Route] Failed to fetch available payment methods: ${err.message}`, err)
    return res.status(500).json({
      message: err.message || "Failed to retrieve Bold payment methods",
    })
  }
}