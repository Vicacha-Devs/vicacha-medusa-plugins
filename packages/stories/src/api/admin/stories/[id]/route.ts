import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  resolveStoriesService,
  type StorySlideDTO,
} from "../../../../modules/story"
import {
  UpdateStorySlideSchema,
  type UpdateStorySlideInput,
} from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
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
  const svc = resolveStoriesService(req.scope)
  const body = (req.validatedBody ??
    UpdateStorySlideSchema.parse(req.body ?? {})) as UpdateStorySlideInput
  const story = await svc.updateSlide(req.params.id, body)
  res.json({ story })
}

export const PUT = PATCH

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const result = await svc.deleteSlide(req.params.id)
  res.json(result)
}
