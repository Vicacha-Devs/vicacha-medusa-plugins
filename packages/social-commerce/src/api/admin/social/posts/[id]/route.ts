import {
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  UpdateMediaPostSchema,
  type HttpRequest,
  type HttpResponse,
} from "../../../../middlewares.js"
import { MedusaError } from "../../../../../modules/social-commerce/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Post ID is required.")
    }
    const socialService = resolveSocialService(req)
    const post = await socialService.getMediaPostWithTags(id)
    res.status(200).json({ post })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function PATCH(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Post ID is required.")
    }
    const body = parseWithMedusaError(
      UpdateMediaPostSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)
    const updated = await socialService.modifyMediaPost(id, {
      ...body,
      expires_at:
        body.expires_at !== undefined
          ? body.expires_at
            ? new Date(body.expires_at)
            : null
          : undefined,
    })
    res.status(200).json({ post: updated })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function DELETE(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Post ID is required.")
    }
    const socialService = resolveSocialService(req)
    const result = await socialService.purgeMediaPost(id)
    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
