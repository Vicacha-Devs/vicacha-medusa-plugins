import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveStoriesService } from "../../../../modules/story"
import { createStoryGroupWorkflow } from "../../../../workflows"
import type { CreateStoryGroupInput } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const state = await svc.listAdminStudioState()
  res.json({ groups: state.groups })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as CreateStoryGroupInput
  const { result } = await createStoryGroupWorkflow(req.scope).run({
    input: body,
  })
  res.status(201).json({ group: result })
}
