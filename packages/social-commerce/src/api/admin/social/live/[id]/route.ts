import {
  getRequestPayload,
  LiveSessionActionSchema,
  parseWithMedusaError,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../../middlewares.js"
import { MedusaError } from "../../../../../modules/social-commerce/index.js"
import {
  liveEndedWorkflow,
  liveStartedWorkflow,
} from "../../../../../workflows/index.js"

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Live session ID is required."
      )
    }

    const body = parseWithMedusaError(
      LiveSessionActionSchema,
      getRequestPayload(req)
    )

    if (body.action === "start") {
      const { result } = await liveStartedWorkflow(req.scope).run({
        input: {
          session_id: id,
          stream_url: body.stream_url,
          platform_live_id: body.platform_live_id,
        },
      })
      res.status(200).json(result)
      return
    }

    const { result } = await liveEndedWorkflow(req.scope).run({
      input: {
        session_id: id,
      },
    })
    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
