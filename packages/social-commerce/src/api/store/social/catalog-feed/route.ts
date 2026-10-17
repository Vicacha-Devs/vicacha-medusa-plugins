import {
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import type {
  CatalogFeedFormat,
  CatalogFeedProductItem,
} from "../../../../modules/social-commerce/types/index.js"

/**
 * Public hosted catalog feed endpoint (`GET /store/social/catalog-feed?format=xml|csv|json`)
 * consumable by Meta Commerce Manager (Instagram/Facebook Shops) and TikTok Shop scheduled pulls.
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)
    const format = ((req.query?.format as string) || "xml") as CatalogFeedFormat
    const currencyCode = String(req.query?.currency_code || "USD").toUpperCase()
    const channelTitle =
      typeof req.query?.title === "string" ? req.query.title : undefined

    let feedItems: CatalogFeedProductItem[] = []

    // Allow custom or Medusa product module resolution if registered in container
    try {
      const customItems = req.query?.items as CatalogFeedProductItem[] | undefined
      if (Array.isArray(customItems)) {
        feedItems = customItems
      }
    } catch {
      feedItems = []
    }

    const generated = await socialService.renderCatalogFeed(feedItems, {
      format,
      channelTitle,
    })

    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", generated.contentType)
    }

    if (format === "json") {
      res.status(200).json({
        format: generated.format,
        currency_code: currencyCode,
        count: generated.itemCount,
        feed: JSON.parse(generated.body),
      })
      return
    }

    if (typeof res.send === "function") {
      res.status(200)
      res.send(generated.body)
    } else {
      res.status(200).json({
        format: generated.format,
        content_type: generated.contentType,
        count: generated.itemCount,
        body: generated.body,
      })
    }
  } catch (err) {
    sendErrorResponse(res, err)
  }
}
