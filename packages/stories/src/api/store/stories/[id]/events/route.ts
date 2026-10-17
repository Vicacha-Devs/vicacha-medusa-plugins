import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { recordStoryEngagementWorkflow } from "../../../../../workflows"
import type { RecordStoryEngagementInput } from "../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = req.validatedBody as RecordStoryEngagementInput
  const { result } = await recordStoryEngagementWorkflow(req.scope).run({
    input: {
      story_id: req.params.id,
      ...body,
    },
  })
  res.json(result)
}
