import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveStoriesService } from "../../../../modules/story"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const analytics = await svc.getAnalyticsOverview()
  res.json({ analytics })
}
