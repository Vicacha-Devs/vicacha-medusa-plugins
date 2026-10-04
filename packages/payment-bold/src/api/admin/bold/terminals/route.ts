import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getTerminalsWorkflow } from "@payment-bold/workflows/get-terminals"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    const { result: terminals } = await getTerminalsWorkflow(req.scope).run()
    
    return res.json({ terminals: terminals || [] })
  } catch (err: any) {
    logger.error(
      `[Bold Terminals Route] Failed executing getTerminalsWorkflow: ${err.message}`,
      err
    )

    return res.status(500).json({
      message: "Failed to retrieve terminal fleet status from Bold API",
      error: err.message,
    })
  }
}