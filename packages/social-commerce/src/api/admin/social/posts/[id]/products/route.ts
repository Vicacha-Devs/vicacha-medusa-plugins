import {
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  TagProductsOnPostSchema,
  type HttpRequest,
  type HttpResponse,
} from "../../../../../middlewares.js"
import { MedusaError } from "../../../../../../modules/social-commerce/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Post ID is required.")
    }
    const socialService = resolveSocialService(req)
    const post = await socialService.getMediaPostWithTags(id)
    res.status(200).json({
      post_id: post.id,
      tagged_products: post.tagged_products,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Post ID is required.")
    }
    const body = parseWithMedusaError(
      TagProductsOnPostSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)

    const tags = await socialService.tagProductsOnPost(
      id,
      body.tags,
      Boolean(body.replace_existing)
    )

    res.status(200).json({
      post_id: id,
      tagged_products: tags,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
