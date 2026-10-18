import { Modules } from "@medusajs/framework/utils"
import {
  resolveSocialService,
  sendErrorResponse,
  type HttpRequest,
  type HttpResponse,
} from "../../../middlewares.js"
import {
  MedusaError,
  type CatalogFeedFormat,
  type CatalogFeedProductItem,
} from "../../../../modules/social-commerce/index.js"

function extractHeaderString(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined
  const direct = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(direct)) return direct[0]
  return typeof direct === "string" ? direct : undefined
}

/**
 * Public or token-protected hosted catalog feed endpoint
 * (`GET /store/social/catalog-feed?format=xml|csv|json&currency_code=USD&country_code=US&sales_channel_id=...`)
 * consumable by Google Merchant Center, Meta Commerce Manager (Instagram/Facebook Shops),
 * and TikTok Shop scheduled pulls.
 */
export async function GET(req: HttpRequest, res: HttpResponse): Promise<void> {
  try {
    const socialService = resolveSocialService(req)

    // 1. Verify optional feed token (Header `x-feed-token`, `Authorization: Bearer`, or `?token=`)
    // TODO(security): `?token=` query parameter is supported alongside `x-feed-token` header because
    // Google Merchant Center and Meta Commerce Manager scheduled HTTP feed crawlers do not support custom headers.
    const headerToken = extractHeaderString(req.headers, "x-feed-token")
    const authHeader = extractHeaderString(req.headers, "authorization")
    const bearerToken =
      authHeader && authHeader.toLowerCase().startsWith("bearer ")
        ? authHeader.slice(7).trim()
        : undefined
    const queryToken =
      typeof req.query?.token === "string" ? req.query.token : undefined
    const providedToken = headerToken || bearerToken || queryToken

    await socialService.verifyCatalogFeedToken(providedToken)

    // 2. Parse & validate query parameters
    const format = ((req.query?.format as string) || "xml") as CatalogFeedFormat
    const rawCurrency =
      (req.query?.currency_code as string | undefined) ||
      (req.query?.currency as string | undefined)
    const rawCountryCode = req.query?.country_code as string | undefined
    const regionId =
      typeof req.query?.region_id === "string" && req.query.region_id.trim()
        ? req.query.region_id.trim()
        : undefined
    const salesChannelId =
      typeof req.query?.sales_channel_id === "string" &&
      req.query.sales_channel_id.trim()
        ? req.query.sales_channel_id.trim()
        : undefined
    const channelTitle =
      typeof req.query?.title === "string" ? req.query.title : undefined

    if (
      rawCurrency !== undefined &&
      !/^[a-zA-Z]{3}$/.test(String(rawCurrency).trim())
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid currency_code "${String(rawCurrency)}". Must be a 3-letter ISO currency code.`
      )
    }
    if (
      rawCountryCode !== undefined &&
      !/^[a-zA-Z]{2}$/.test(String(rawCountryCode).trim())
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid country_code "${String(rawCountryCode)}". Must be a 2-letter ISO country code.`
      )
    }

    const countryCode = rawCountryCode?.trim().toUpperCase()
    let resolvedCurrency = rawCurrency?.trim().toUpperCase()
    let resolvedRegionId = regionId

    // 3. Optionally resolve region currency from Medusa Region module when country_code or region_id is provided
    if ((!resolvedCurrency || !resolvedRegionId) && (countryCode || regionId)) {
      try {
        const regionModule = req.scope?.resolve?.(Modules.REGION) as unknown as
          | {
              listRegions?: (
                filters?: Record<string, unknown>,
                config?: Record<string, unknown>
              ) => Promise<Array<Record<string, unknown>>>
            }
          | undefined
        if (regionModule && typeof regionModule.listRegions === "function") {
          const regions = await regionModule.listRegions(
            {},
            { relations: ["countries"] }
          )
          if (Array.isArray(regions)) {
            const matchedRegion = regions.find((r) => {
              if (regionId && String(r.id) === regionId) return true
              if (countryCode && Array.isArray(r.countries)) {
                return (r.countries as Array<Record<string, unknown>>).some(
                  (c) =>
                    String(c.iso_2 || "").toUpperCase() === countryCode
                )
              }
              return false
            })
            if (matchedRegion) {
              if (!resolvedRegionId && matchedRegion.id) {
                resolvedRegionId = String(matchedRegion.id)
              }
              if (!resolvedCurrency && matchedRegion.currency_code) {
                resolvedCurrency = String(
                  matchedRegion.currency_code
                ).toUpperCase()
              }
            }
          }
        }
      } catch {
        // Fallback to default currency if region module is not registered in container
      }
    }

    const currencyCode = resolvedCurrency || "USD"

    // 4. Resolve feed items from explicit items, raw Medusa products, or Medusa product module
    let feedItems: CatalogFeedProductItem[] = []
    const customItems = req.query?.items as CatalogFeedProductItem[] | undefined
    const customProducts = req.query?.products as
      | Array<Record<string, unknown>>
      | undefined

    if (Array.isArray(customItems)) {
      feedItems = customItems
    } else if (Array.isArray(customProducts)) {
      feedItems = await socialService.mapMedusaProductsToFeedItems(customProducts, {
        currencyCode,
        countryCode,
        regionId: resolvedRegionId,
        salesChannelId,
      })
    } else {
      try {
        const productModule = req.scope?.resolve?.(Modules.PRODUCT) as unknown as
          | {
              listProducts?: (
                filters?: Record<string, unknown>,
                config?: Record<string, unknown>
              ) => Promise<Array<Record<string, unknown>>>
            }
          | undefined
        if (productModule && typeof productModule.listProducts === "function") {
          const products = await productModule.listProducts(
            { status: "published" },
            { relations: ["variants", "images", "options", "categories", "type"] }
          )
          if (Array.isArray(products) && products.length > 0) {
            feedItems = await socialService.mapMedusaProductsToFeedItems(products, {
              currencyCode,
              countryCode,
              regionId: resolvedRegionId,
              salesChannelId,
            })
          }
        }
      } catch {
        feedItems = []
      }
    }

    const generated = await socialService.renderCatalogFeed(feedItems, {
      format,
      channelTitle,
      currencyCode: resolvedCurrency,
      countryCode,
      regionId: resolvedRegionId,
      salesChannelId,
    })

    if (typeof res.setHeader === "function") {
      res.setHeader("Content-Type", generated.contentType)
      res.setHeader("X-Content-Type-Options", "nosniff")
      res.setHeader("X-Frame-Options", "DENY")
      res.setHeader(
        "Cache-Control",
        (await socialService.isFeedTokenRequired())
          ? "private, no-store"
          : "public, max-age=300"
      )
    }

    if (generated.format === "json") {
      res.status(200).json({
        format: generated.format,
        currency_code: currencyCode,
        ...(countryCode ? { country_code: countryCode } : {}),
        ...(resolvedRegionId ? { region_id: resolvedRegionId } : {}),
        ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
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
