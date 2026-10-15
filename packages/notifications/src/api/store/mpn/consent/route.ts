import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type NotificationsModuleService from "../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../modules/notifications/types"
import { maskRecipientPii } from "../../../../modules/notifications/utils/security"
import { verifyStoreCustomerSession } from "../../../middlewares"
import { StoreConsentSchema } from "../../../validators"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = StoreConsentSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid consent request",
      details: parsed.error.flatten(),
    })
  }

  const session = verifyStoreCustomerSession(req)
  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  const record = await mpnService.upsertConsent({
    identifier: parsed.data.identifier,
    channel: parsed.data.channel,
    customer_id: session.customerId,
    action: parsed.data.action,
    source: "checkout",
    metadata: parsed.data.cart_id
      ? { cart_id: parsed.data.cart_id }
      : undefined,
  })

  return res.json({
    success: true,
    consent: {
      id: record.id,
      channel: record.channel,
      identifier_masked: maskRecipientPii(record.identifier),
      status: record.status,
    },
  })
}
