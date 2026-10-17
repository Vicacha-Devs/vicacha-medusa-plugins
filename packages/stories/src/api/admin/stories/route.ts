import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type StoriesModuleService from "../../../modules/story/service"
import { STORIES_MODULE } from "../../../modules/story/types"
import { createStorySlideWorkflow } from "../../../workflows"
import type { CreateStorySlideInput } from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve(STORIES_MODULE) as StoriesModuleService
  const productId =
    typeof req.query.product_id === "string" ? req.query.product_id : undefined

  const state = await svc.listAdminStudioState(
    productId ? { product_id: productId } : undefined
  )

  res.json({
    stories: state.slides,
    groups: state.groups,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as CreateStorySlideInput
  const { result } = await createStorySlideWorkflow(req.scope).run({
    input: body,
  })
  res.status(201).json({ story: result })
}
