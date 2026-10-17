import {
  AttachLiveProductsSchema,
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../../../middlewares.js"
import { MedusaError } from "../../../../../../modules/social-commerce/index.js"

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
      AttachLiveProductsSchema,
      getRequestPayload(req)
    )
    const socialService = resolveSocialService(req)
    const products = await socialService.pinProductsToLiveSession(
      id,
      body.products
    )

    res.status(200).json({
      session_id: id,
      products,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
