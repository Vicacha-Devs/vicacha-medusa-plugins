import {
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type {
  MediaType,
  SocialPlatform,
} from "../../../../modules/social-commerce/types/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const platform = req.query?.platform as SocialPlatform | undefined
    const mediaType = req.query?.media_type as MediaType | undefined
    const shoppableOnly =
      req.query?.shoppable_only === "true" || req.query?.shoppable_only === true
    const featuredOnly =
      req.query?.featured_only === "true" || req.query?.featured_only === true
    const limit = req.query?.limit ? Number(req.query.limit) : 24
    const offset = req.query?.offset ? Number(req.query.offset) : 0

    const result = await socialService.listMediaPosts({
      platform,
      media_type: mediaType,
      status: "active",
      is_shoppable: shoppableOnly ? true : undefined,
      is_featured: featuredOnly ? true : undefined,
      include_expired: false,
      limit,
      offset,
    })

    res.status(200).json({
      feed: result.posts,
      count: result.count,
      limit,
      offset,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
