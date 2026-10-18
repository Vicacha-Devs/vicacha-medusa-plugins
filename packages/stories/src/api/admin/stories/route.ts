import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { resolveStoriesService } from "../../../modules/story"
import { createStorySlideWorkflow } from "../../../workflows"
import {
  CreateStorySlideSchema,
  type CreateStorySlideInput,
} from "../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = resolveStoriesService(req.scope)
  const productId =
    typeof req.query?.product_id === "string" ? req.query.product_id : undefined

  const state = await svc.listAdminStudioState(
    productId ? { product_id: productId } : undefined
  )

  res.json({
    stories: state.slides,
    groups: state.groups,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.validatedBody ??
    CreateStorySlideSchema.parse(req.body ?? {})) as CreateStorySlideInput
  const { result } = await createStorySlideWorkflow(req.scope).run({
    input: body,
  })
  res.status(201).json({ story: result })
}
