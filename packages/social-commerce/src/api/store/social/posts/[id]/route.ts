import {
  resolveSocialService,
  sendErrorResponse,
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

    if (post.status !== "active") {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `SocialMediaPost "${id}" is not active.`
      )
    }

    res.status(200).json({ post })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
