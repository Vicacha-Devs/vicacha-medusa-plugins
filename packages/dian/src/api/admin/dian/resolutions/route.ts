import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import DianModuleService from "../../../../modules/dian/service"
import { DIAN_MODULE } from "../../../../types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  await dianService.getGlobalConfig()
  const resolutions = await dianService.listDianResolutions({})
  return res.status(200).json({ resolutions })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const body = (req.validatedBody || req.body || {}) as Record<string, any>

  if (body.action === "sync_from_dian") {
    const synced = await dianService.syncNumberingRangesFromDian()
    const resolutions = await dianService.listDianResolutions({})
    return res.status(200).json({ synced, resolutions })
  }

  const resolution = await dianService.upsertResolution(body)
  return res.status(200).json({ resolution })
}
