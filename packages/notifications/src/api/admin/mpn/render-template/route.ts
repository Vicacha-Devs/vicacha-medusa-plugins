import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import type NotificationsModuleService from "../../../../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../../../../modules/notifications/types"
import { hydrateEntityContextData } from "../../../../workflows"
import { RenderTemplatePreviewSchema } from "../../../validators"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = RenderTemplatePreviewSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid render preview request",
      details: parsed.error.flatten(),
    })
  }

  const mpnService = req.scope.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const input = parsed.data

  const hydrated = input.data
    ? { transformedData: input.data }
    : await hydrateEntityContextData(req.scope, {
        context_type: input.context_type,
        entity_id: input.entity_id,
        locale: input.locale,
      })

  const rendered = await mpnService.renderTemplateById({
    template_id: input.template_id,
    context_type: input.context_type,
    data: hydrated.transformedData,
    locale: input.locale,
    append_sms_consent_footer: input.append_sms_consent_footer,
  })

  return res.json({
    success: true,
    rendered,
    context_sample: hydrated.transformedData,
  })
}
