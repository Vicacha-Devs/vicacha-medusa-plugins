import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../../modules/story/service"
import { STORIES_MODULE } from "../../../../modules/story/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const analytics = await svc.getAnalyticsOverview()
  res.json({ analytics })
}
