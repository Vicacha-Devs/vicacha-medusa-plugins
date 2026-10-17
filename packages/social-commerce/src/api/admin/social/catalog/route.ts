import {
  getRequestPayload,
  parseWithMedusaError,
  resolveSocialService,
  sendErrorResponse,
  SyncCatalogBatchSchema,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import { catalogSyncWorkflow } from "../../../../workflows/index.js"
import type { SocialPlatform } from "../../../../modules/social-commerce/types/index.js"

export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const socialAccountId = req.query?.social_account_id as string | undefined
    const platform = req.query?.platform as SocialPlatform | undefined
    const syncStatus = req.query?.sync_status as
      | "pending"
      | "synced"
      | "failed"
      | undefined
    const productId = req.query?.product_id as string | undefined

    const items = await socialService.listCatalogItems({
      social_account_id: socialAccountId,
      platform,
      sync_status: syncStatus,
      product_id: productId,
    })

    res.status(200).json({
      catalog_items: items,
      count: items.length,
    })
  } catch (err) {
    sendErrorResponse(res, err)
  }
}

export async function POST(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const body = parseWithMedusaError(
      SyncCatalogBatchSchema,
      getRequestPayload(req)
    )
    const { result } = await catalogSyncWorkflow(req.scope).run({
      input: {
        account_id: body.account_id,
        external_catalog_id: body.external_catalog_id,
        items: body.items,
      },
    })

    res.status(200).json(result)
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
