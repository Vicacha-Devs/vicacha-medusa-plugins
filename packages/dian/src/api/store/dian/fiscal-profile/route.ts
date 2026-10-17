import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import DianModuleService from "../../../../modules/dian/service"
import { DIAN_ERROR_CODES, DIAN_MODULE } from "../../../../types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const customerId =
    (req as any).auth_context?.actor_id ||
    String((req.query as any)?.customer_id || "")

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Only registered and authenticated clients can access a DIAN fiscal profile.",
      DIAN_ERROR_CODES.CLIENT_REQUIRED
    )
  }

  const profiles = await dianService.listDianCustomerFiscalProfiles({
    customer_id: customerId,
  })
  return res.status(200).json({ fiscal_profile: profiles[0] ?? null })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const body = (req.validatedBody || req.body || {}) as Record<string, any>
  const customerId =
    (req as any).auth_context?.actor_id || String(body.customer_id || "")

  if (!customerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Buyers requesting a DIAN Electronic Invoice must be registered clients.",
      DIAN_ERROR_CODES.CLIENT_REQUIRED
    )
  }

  const fiscal_profile = await dianService.upsertCustomerFiscalProfile(
    {
      ...body,
      customer_id: customerId,
    },
    req.scope as unknown as { resolve: (key: string) => unknown }
  )

  return res.status(200).json({ fiscal_profile })
}
