import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, PaymentSessionStatus } from "@medusajs/framework/utils"
import { IPaymentModuleService, Logger } from "@medusajs/framework/types"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger")
  const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT)

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

          // Strategy 1: Check via getPaymentStatus
          if (typeof providerInstance.getPaymentStatus === "function") {
            const statusRes = await providerInstance.getPaymentStatus({ data: session.data })
            if (
              statusRes?.status === PaymentSessionStatus.AUTHORIZED ||
              statusRes?.status === PaymentSessionStatus.CAPTURED
            ) {
              isAuthorized = true
            }
          } 
          // Strategy 2: Fallback to getStatus
          else if (typeof providerInstance.getStatus === "function") {
            const remoteStatus = await providerInstance.getStatus(session.data)
            if (remoteStatus === "captured" || remoteStatus === "authorized") {
              isAuthorized = true
            }
          }

          if (isAuthorized) {
            logger.info(`[Bold Stream] Payment confirmed for session '${session.id}'. Authorizing in Medusa DB...`)
            await paymentModule.authorizePaymentSession(paymentSessionId, {})
            session = await paymentModule.retrievePaymentSession(paymentSessionId)
            logger.info(`[Bold Stream] Session '${session.id}' authorized successfully. Status: ${session.status}`)
          }
        } else {
          logger.warn(`[Bold Stream] Provider instance for '${session.provider_id}' not found on Payment Module.`)
        }
      }

      // 2. Write event stream payload to client
      res.write(`data: ${JSON.stringify({ status: session.status, session })}\n\n`)

      // 3. Close SSE stream once session reaches terminal status
      if (["authorized", "captured", "canceled", "error"].includes(session.status)) {
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
