import {
  getRequestPayload,
  parseWithMedusaError,
  sendErrorResponse,
  SyncMediaRequestSchema,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import { mediaSyncedWorkflow } from "../../../../workflows/index.js"

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      SyncMediaRequestSchema,
      getRequestPayload(req)
    )
    const { result } = await mediaSyncedWorkflow(req.scope).run({
      input: {
        account_id: body.account_id,
        platform: body.platform,
        include_stories: body.include_stories,
      },
    })

    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
