import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import DianModuleService from "../../../../modules/dian/service"
import { DANE_DEPARTMENTS, DANE_MUNICIPALITIES } from "../../../../modules/dian/utils"
import { DIAN_MODULE } from "../../../../types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const config = await dianService.getGlobalConfig()
  return res.status(200).json({
    config,
    dane_departments: DANE_DEPARTMENTS,
    dane_municipalities: DANE_MUNICIPALITIES,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const config = await dianService.upsertConfig(
    (req.validatedBody || req.body || {}) as Record<string, unknown>
  )
  return res.status(200).json({ config })
}
