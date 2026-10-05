import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getPaymentLinkMethodsWorkflow } from "@payment-bold/workflows/get-payment-link-methods"


export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result } = await getPaymentLinkMethodsWorkflow(req.scope).run()
    return res.json(result)
  } catch (err: any) {
    logger.error(`[Bold Payment Link Methods Route] Failed to fetch available payment methods: ${err.message}`, err)
    return res.status(500).json({
      message: err.message || "Failed to retrieve Bold Payment Link payment methods",
    })
  }
}
