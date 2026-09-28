import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IPaymentModuleService, Logger } from "@medusajs/framework/types"
import { BoldIntegrityService } from "../../../../services/integrity"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const logger: Logger = req.scope.resolve("logger")

  try {
    const signatureHeader = (
      req.headers["x-bold-signature"] || 
      req.headers["x-signature"]
    ) as string

    const timestampHeader = (
      req.headers["x-bold-timestamp"] || 
      req.headers["x-timestamp"]
    ) as string

    // 1. Resolve Bold Provider to access configured key pairs
    const boldLinkProvider = req.scope.resolve("pp_bold-link_bold") as any
    const options = boldLinkProvider?.options_ || {}

    // 2. Order candidate secret keys based on Bold's priority rule
    const possibleSecrets: string[] = [
      options.buttonSecretKey,
      options.integrationSecretKey,
    ].filter((key): key is string => typeof key === "string" && key.length > 0)

    const rawBody = (req as any).rawBody || JSON.stringify(req.body)

    // 3. Verify webhook signature against configured secret keys
    if (signatureHeader && timestampHeader && possibleSecrets.length > 0) {
      const isValid = possibleSecrets.some((secretKey) =>
        BoldIntegrityService.verifyWebhookSignature(
          rawBody,
          signatureHeader,
          timestampHeader,
          secretKey
        )
      )

      if (!isValid) {
        logger.warn("[Bold Webhook] Signature verification failed against configured secret keys.")
        res.status(401).json({ message: "Invalid webhook signature" })
        return
      }
    }

    const payload = req.body as Record<string, any>
    const eventType = payload?.event
    const data = payload?.data

    logger.info(`[Bold Webhook] Received event '${eventType}' for reference '${data?.reference}'`)

    // 4. Capture payment in Medusa DB on successful sale
    if (eventType === "sale.successful" && (data?.status === "APPROVED" || data?.status === "PAID")) {
      const reference = data?.reference
      const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT)

      if (reference) {
        const paymentSessions = await paymentModule.listPaymentSessions({})
        
        const matchingSession = paymentSessions.find((session) => {
          const sData = (session.data || {}) as Record<string, any>
          const isMatch =
            sData.reference === reference ||
            sData.payment_link_id === reference ||
            sData.payment_link === reference ||
            session.id === reference

          return isMatch && session.status === "pending"
        })

        if (matchingSession) {
          await paymentModule.authorizePaymentSession(matchingSession.id, {})
          logger.info(`[Bold Webhook] Payment session authorized successfully: ${matchingSession.id}`)
        } else {
          logger.warn(`[Bold Webhook] No matching pending session found for reference: ${reference}`)
        }
      }
    }

    res.status(200).json({ received: true })
  } catch (error: any) {
    logger.error(`[Bold Webhook] Exception processing webhook event: ${error.message}`)
    res.status(500).json({ message: error.message || "Internal server error" })
  }
}
