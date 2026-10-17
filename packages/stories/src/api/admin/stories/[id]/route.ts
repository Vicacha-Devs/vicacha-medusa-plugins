import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import type StoriesModuleService from "../../../../modules/story/service"
import {
  STORIES_MODULE,
  type StorySlideDTO,
} from "../../../../modules/story/types"
import type { UpdateStorySlideInput } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const rows = await svc.listStories({ id: req.params.id })
  const raw = rows?.[0]
  if (!raw) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Story "${req.params.id}" not found.`
    )
  }
  const story = await svc.hydrateSlide(raw as unknown as StorySlideDTO)
  res.json({ story })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const body = req.validatedBody as UpdateStorySlideInput
  const story = await svc.updateSlide(req.params.id, body)
  res.json({ story })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const result = await svc.deleteSlide(req.params.id)
  res.json(result)
}
