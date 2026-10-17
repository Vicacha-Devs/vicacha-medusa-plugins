import {
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type { SocialPlatform } from "../../../../modules/social-commerce/types/index.js"

/**
 * Returns active, non-expired 24h stories across Instagram, Facebook, TikTok, and Local Admin stories.
 * Full superset of `@bambiste/medusa-stories` (`GET /store/stories`).
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const platform = req.query?.platform as SocialPlatform | undefined
    const featuredOnly =
      req.query?.featured_only === "true" || req.query?.featured_only === true
    const limit = req.query?.limit ? Number(req.query.limit) : 50

    const stories = await socialService.listActiveStories({
      platform,
      is_featured: featuredOnly ? true : undefined,
      limit,
    })

    res.status(200).json({
      stories,
      count: stories.length,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
