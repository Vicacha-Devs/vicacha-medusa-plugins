import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveStoriesService } from "../../../../../modules/story"
import type { CreateStoryHotspotInput } from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const body = req.validatedBody as CreateStoryHotspotInput
  const hotspot = await svc.addHotspot(req.params.id, body)
  res.status(201).json({ hotspot })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const body = req.validatedBody as { hotspot_id: string }
  const result = await svc.removeHotspot(body.hotspot_id, req.params.id)
  res.json(result)
}
