import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import DianModuleService from "../../../../modules/dian/service"
import { DIAN_MODULE } from "../../../../types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const query = req.query as Record<string, string | undefined>

  if (query.lookup_nit) {
    const acquirer = await dianService.lookupAcquirerInDian({
      identification_type: query.identification_type || "31",
      identification_number: query.lookup_nit,
    })
    return res.status(200).json({ acquirer })
  }

  const filter: Record<string, unknown> = {}
  if (query.customer_id) {
    filter.customer_id = query.customer_id
  }
  const fiscal_profiles = await dianService.listDianCustomerFiscalProfiles(
    filter
  )
  return res.status(200).json({ fiscal_profiles })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const body = (req.validatedBody || req.body || {}) as Record<string, any>
  const fiscal_profile = await dianService.upsertCustomerFiscalProfile(
    body,
    req.scope as unknown as { resolve: (key: string) => unknown }
  )
  return res.status(200).json({ fiscal_profile })
}
