import {
  CreateLocalStorySchema,
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type {
  MediaType,
  PostStatus,
  SocialPlatform,
} from "../../../../modules/social-commerce/types/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const productId =
      typeof req.query?.product_id === "string"
        ? req.query.product_id.trim()
        : undefined

    if (productId) {
      const tagged = await socialService.listPostsForProduct(productId)
      res.status(200).json({
        posts: tagged.map((t) => ({
          ...t.post,
          tagged_products: [t.tag],
        })),
        count: tagged.length,
      })
      return
    }

    const platform = req.query?.platform as SocialPlatform | undefined
    const mediaType = req.query?.media_type as MediaType | undefined
    const status = req.query?.status as PostStatus | undefined
    const includeExpired =
      req.query?.include_expired === "true" || req.query?.include_expired === true
    const limit = req.query?.limit ? Number(req.query.limit) : 50
    const offset = req.query?.offset ? Number(req.query.offset) : 0

    const result = await socialService.listMediaPosts({
      platform,
      media_type: mediaType,
      status,
      include_expired: includeExpired,
      limit,
      offset,
    })

    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      CreateLocalStorySchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)

    const story = await socialService.publishLocalStory(body)
    res.status(201).json({ post: story })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
