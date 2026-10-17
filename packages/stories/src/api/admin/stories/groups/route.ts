import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../../modules/story/service"
import { STORIES_MODULE } from "../../../../modules/story/types"
import { createStoryGroupWorkflow } from "../../../../workflows"
import type { CreateStoryGroupInput } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
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
