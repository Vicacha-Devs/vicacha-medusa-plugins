import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getIntegrationApiPaymentMethodsWorkflow } from "@payment-bold/workflows/get-integration-api-payment-methods"


export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await getIntegrationApiPaymentMethodsWorkflow(req.scope).run()
    return res.json(result)
  } catch (err: any) {
    logger.error(`[Bold Integration API Payment Methods Route] Failed to fetch available payment methods: ${err.message}`, err)
    return res.status(500).json({
      message: err.message || "Failed to retrieve Bold Integration API payment methods",
    })
  }
}