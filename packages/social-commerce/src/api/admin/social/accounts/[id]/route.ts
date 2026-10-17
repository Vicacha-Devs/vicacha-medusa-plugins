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
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Account ID is required.")
    }
    const socialService = resolveSocialService(req)
    const account = await socialService.getAccount(id)
    res.status(200).json({ account })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Account ID is required.")
    }
    const socialService = resolveSocialService(req)
    const account = await socialService.refreshAccountTokens(id)
    res.status(200).json({ account })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function DELETE(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const id = req.params?.id
    if (!id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Account ID is required.")
    }
    const socialService = resolveSocialService(req)
    const hardDelete = req.query?.hard === "true" || req.query?.hard === true
    const result = await socialService.disconnectAccount(id, hardDelete)
    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
