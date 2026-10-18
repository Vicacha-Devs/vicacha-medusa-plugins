import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { resolveStoriesService } from "../../../../../modules/story"
import type { UpdateStoryGroupInput } from "../../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const state = await svc.listAdminStudioState()
  const group = state.groups.find((g) => g.id === req.params.id)
  if (!group) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Story group "${req.params.id}" not found.`
    )
  }
  res.json({ group })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const body = req.validatedBody as UpdateStoryGroupInput
  const group = await svc.updateGroup(req.params.id, body)
  res.json({ group })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const result = await svc.deleteGroup(req.params.id)
  res.json(result)
}
