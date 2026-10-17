import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../../../modules/story/service"
import { STORIES_MODULE } from "../../../../../modules/story/types"
import type { CreateStoryHotspotInput } from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as CreateStoryHotspotInput
  const hotspot = await svc.addHotspot(req.params.id, body)
  res.status(201).json({ hotspot })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as { hotspot_id: string }
  const result = await svc.removeHotspot(body.hotspot_id, req.params.id)
  res.json(result)
}
