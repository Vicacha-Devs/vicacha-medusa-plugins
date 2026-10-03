import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentSessionStatus } from "@medusajs/framework/utils"
import { IPaymentModuleService, Logger } from "@medusajs/framework/types"
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger")
  const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT)
  const remoteQuery = req.scope.resolve("remoteQuery")

  const paymentSessionId = (
    req.query.paymentSessionId ||
    req.query.payment_session_id
  ) as string

  if (!paymentSessionId) {
    logger.warn("[Bold Stream] Connection attempt missing paymentSessionId query parameter.")
    res.status(400).json({ message: "Missing paymentSessionId parameter" })
    return
  }

  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  logger.info(`[Bold Stream] SSE connection established for session '${paymentSessionId}'`)

  const intervalId = setInterval(async () => {
    try {
      let session = await paymentModule.retrievePaymentSession(paymentSessionId)

      // 1. If still pending, query status using the active registered provider instance
      if (session.status === "pending" && session.provider_id) {
        const providerInstance =
          (paymentModule as any).getPaymentProvider?.(session.provider_id) ||
          (paymentModule as any).paymentProviderService_?.retrieveProvider?.(session.provider_id)

        if (providerInstance) {
          let isAuthorized = false

          if (typeof providerInstance.getPaymentStatus === "function") {
            const statusRes = await providerInstance.getPaymentStatus({ data: session.data })

            if (
              statusRes?.status === PaymentSessionStatus.AUTHORIZED ||
              statusRes?.status === PaymentSessionStatus.CAPTURED
            ) {
              isAuthorized = true
            }
          } else if (typeof providerInstance.getStatus === "function") {
            const remoteStatus = await providerInstance.getStatus(session.data)

            if (remoteStatus === "captured" || remoteStatus === "authorized") {
              isAuthorized = true
            }
          }

          if (isAuthorized) {
            logger.info(`[Bold Stream] Confirming payment for session '${session.id}'...`)

            const collectionId = session.payment_collection_id

            if (collectionId) {
              // Medusa v2 remoteQuery syntax
              const colData = await remoteQuery({
                entryPoint: "payment_collection",
                fields: [
                  "id",
                  "status",
                  "amount",
                  "payment_sessions.*",
                  "payments.*",
                ],
                variables: { id: collectionId },
              })
            }

            // Step A: Authorize the session in Medusa Payment Module
            const authorizedPayment = await paymentModule.authorizePaymentSession(session.id, {})

            const paymentId =
              (authorizedPayment as any)?.id ||
              (authorizedPayment as any)?.payment?.id

            // Step B: Execute capture workflow
            if (paymentId) {
              const captureResult = await capturePaymentWorkflow(req.scope).run({
                input: {
                  payment_id: paymentId,
                },
              })
              logger.info(`[Bold Stream] Successfully captured payment '${paymentId}' with provider '${session.provider_id}'`)
            } else {
              logger.warn(`[Bold Stream] No payment ID returned from authorizePaymentSession for session '${session.id}'`)
            }

            session = await paymentModule.retrievePaymentSession(paymentSessionId)
          }
        } else {
          logger.warn(`[Bold Stream] Provider instance for '${session.provider_id}' not found on Payment Module.`)
        }
      }

      // Write event stream payload to client
      res.write(`data: ${JSON.stringify({ status: session.status, session })}\n\n`)

      if (["authorized", "captured", "completed", "canceled", "error"].includes(session.status)) {
        logger.info(`[Bold Stream] Stream completed for session '${session.id}' with status '${session.status}'. Closing connection.`)
        clearInterval(intervalId)
        res.end()
      }
    } catch (error: any) {
      logger.error(`[Bold Stream] Error during SSE polling interval: ${error.message}`)
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
      clearInterval(intervalId)
      res.end()
    }
  }, 3000)

  req.on("close", () => {
    logger.info(`[Bold Stream] Client disconnected SSE stream for session '${paymentSessionId}'`)
    clearInterval(intervalId)
  })
}
