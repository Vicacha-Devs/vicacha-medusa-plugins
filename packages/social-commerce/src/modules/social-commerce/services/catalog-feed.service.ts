import { MedusaError } from "../utils/medusa-error.js"
import { escapeCsvField, escapeXml, sanitizeHttpUrl } from "../utils/security.js"
import type {
  CatalogFeedFormat,
  CatalogFeedProductItem,
  CheckoutHandoffInput,
  CheckoutHandoffLineItem,
  CheckoutHandoffResult,
} from "../types/index.js"

export interface GenerateCatalogFeedOptions {
  format?: CatalogFeedFormat
  channelTitle?: string
  channelLink?: string
  channelDescription?: string
}

/**
 * Generates outbound product catalog feeds (Meta RSS 2.0 XML, TikTok/Meta CSV, JSON)
 * and handles Social Checkout Handoff deep-link parsing & checkout URL construction.
 */
export class CatalogFeedService {
  private readonly defaultStorefrontUrl: string
  private readonly defaultBrandName: string

  constructor(options?: {
    storefrontUrl?: string
    brandName?: string
  }) {
    this.defaultStorefrontUrl =
      options?.storefrontUrl?.replace(/\/+$/, "") || "https://store.example.com"
    this.defaultBrandName = options?.brandName?.trim() || "Medusa Store"
  }

  /**
   * Generates a catalog feed in XML (RSS 2.0 `g:*`), CSV, or JSON format.
   */
  generateFeed(
    items: CatalogFeedProductItem[],
    options?: GenerateCatalogFeedOptions
  ): {
    contentType: string
    body: string
    itemCount: number
    format: CatalogFeedFormat
  } {
    const format: CatalogFeedFormat = options?.format ?? "xml"
    if (format !== "xml" && format !== "csv" && format !== "json") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported catalog feed format "${String(format)}". Supported formats: xml, csv, json.`
      )
    }

    const normalizedItems = items.map((item) => this.normalizeFeedItem(item))

    if (format === "json") {
      return {
        format: "json",
        contentType: "application/json; charset=utf-8",
        itemCount: normalizedItems.length,
        body: JSON.stringify(
          {
            title: options?.channelTitle || `${this.defaultBrandName} Product Feed`,
            link: options?.channelLink || this.defaultStorefrontUrl,
            generated_at: new Date().toISOString(),
            count: normalizedItems.length,
            items: normalizedItems,
          },
          null,
          2
        ),
      }
    }

    if (format === "csv") {
      return {
        format: "csv",
        contentType: "text/csv; charset=utf-8",
        itemCount: normalizedItems.length,
        body: this.renderCsvFeed(normalizedItems),
      }
    }

    return {
      format: "xml",
      contentType: "application/xml; charset=utf-8",
      itemCount: normalizedItems.length,
      body: this.renderXmlFeed(normalizedItems, options),
    }
  }

  private normalizeFeedItem(item: CatalogFeedProductItem): CatalogFeedProductItem {
    if (!item.id?.trim() || !item.item_group_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Catalog feed item requires both id (variant_id) and item_group_id (product_id)."
      )
    }

    const currency = (item.currency_code || "USD").toUpperCase()
    const safeLink =
      sanitizeHttpUrl(item.link) ||
      `${this.defaultStorefrontUrl}/products/${encodeURIComponent(item.item_group_id)}?variant=${encodeURIComponent(item.id)}`
    const safeImage =
      sanitizeHttpUrl(item.image_link) ||
      `${this.defaultStorefrontUrl}/placeholder-product.png`

    return {
      ...item,
      id: item.id.trim(),
      item_group_id: item.item_group_id.trim(),
      title: item.title?.trim() || item.id.trim(),
      description: item.description?.trim() || item.title?.trim() || item.id.trim(),
      link: safeLink,
      image_link: safeImage,
      currency_code: currency,
      availability: item.availability || "in stock",
      condition: item.condition || "new",
      brand: item.brand?.trim() || this.defaultBrandName,
    }
  }

  private renderXmlFeed(
    items: CatalogFeedProductItem[],
    options?: GenerateCatalogFeedOptions
  ): string {
    const title = escapeXml(options?.channelTitle || `${this.defaultBrandName} Social Catalog`)
    const link = escapeXml(
      sanitizeHttpUrl(options?.channelLink) || this.defaultStorefrontUrl
    )
    const description = escapeXml(
      options?.channelDescription ||
        "Automated product catalog feed for Meta Shops (Instagram/Facebook) and TikTok Shop"
    )

    const xmlItems = items
      .map((item) => {
        const priceFormatted = `${Number(item.price || 0).toFixed(2)} ${escapeXml(item.currency_code)}`
        const salePriceTag =
          typeof item.sale_price === "number" && item.sale_price >= 0
            ? `\n      <g:sale_price>${Number(item.sale_price).toFixed(2)} ${escapeXml(item.currency_code)}</g:sale_price>`
            : ""
        const categoryTag = item.google_product_category
          ? `\n      <g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>`
          : ""
        const inventoryTag =
          typeof item.inventory_quantity === "number"
            ? `\n      <g:quantity_to_sell_on_facebook>${Math.max(0, Math.floor(item.inventory_quantity))}</g:quantity_to_sell_on_facebook>`
            : ""

        return `    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:item_group_id>${escapeXml(item.item_group_id)}</g:item_group_id>
      <g:title>${escapeXml(item.title)}</g:title>
      <g:description>${escapeXml(item.description)}</g:description>
      <g:link>${escapeXml(item.link)}</g:link>
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition || "new")}</g:condition>
      <g:price>${priceFormatted}</g:price>${salePriceTag}
      <g:brand>${escapeXml(item.brand || this.defaultBrandName)}</g:brand>${categoryTag}${inventoryTag}
    </item>`
      })
      .join("\n")

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${title}</title>
    <link>${link}</link>
    <description>${description}</description>
${xmlItems}
  </channel>
</rss>`
  }

  private renderCsvFeed(items: CatalogFeedProductItem[]): string {
    const headers = [
      "id",
      "item_group_id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "sale_price",
      "link",
      "image_link",
      "brand",
      "inventory_quantity",
      "google_product_category",
    ]

    const rows = items.map((item) => {
      const priceFormatted = `${Number(item.price || 0).toFixed(2)} ${item.currency_code}`
      const salePriceFormatted =
        typeof item.sale_price === "number" && item.sale_price >= 0
          ? `${Number(item.sale_price).toFixed(2)} ${item.currency_code}`
          : ""

      return [
        escapeCsvField(item.id),
        escapeCsvField(item.item_group_id),
        escapeCsvField(item.title),
        escapeCsvField(item.description),
        escapeCsvField(item.availability),
        escapeCsvField(item.condition || "new"),
        escapeCsvField(priceFormatted),
        escapeCsvField(salePriceFormatted),
        escapeCsvField(item.link),
        escapeCsvField(item.image_link),
        escapeCsvField(item.brand || this.defaultBrandName),
        escapeCsvField(
          typeof item.inventory_quantity === "number"
            ? Math.max(0, Math.floor(item.inventory_quantity))
            : ""
        ),
        escapeCsvField(item.google_product_category || ""),
      ].join(",")
    })

    return [headers.join(","), ...rows].join("\n")
  }

  /**
   * Parses the Meta/TikTok checkout URL query format (`products=variant_1:1,variant_2:3`)
   * or structured `items` array into validated `CheckoutHandoffLineItem[]`.
   */
  parseProductsParam(
    productsParam?: string,
    explicitItems?: CheckoutHandoffLineItem[]
  ): CheckoutHandoffLineItem[] {
    const merged = new Map<string, number>()

    if (typeof productsParam === "string" && productsParam.trim().length > 0) {
      const pairs = productsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)

      for (const pair of pairs) {
        const [rawVariantId, rawQty] = pair.split(":")
        const variantId = rawVariantId?.trim()
        if (!variantId || !/^[a-zA-Z0-9_-]{1,128}$/.test(variantId)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Invalid variant identifier in checkout handoff parameter: "${pair}".`
          )
        }
        const qty = rawQty !== undefined ? Number.parseInt(rawQty.trim(), 10) : 1
        if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Invalid quantity for variant "${variantId}" in checkout handoff parameter.`
          )
        }
        merged.set(variantId, (merged.get(variantId) ?? 0) + qty)
      }
    }

    if (Array.isArray(explicitItems)) {
      for (const item of explicitItems) {
        const variantId = item?.variant_id?.trim()
        const qty = item?.quantity
        if (!variantId || !/^[a-zA-Z0-9_-]{1,128}$/.test(variantId)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Each checkout handoff item must include a valid alphanumeric variant_id."
          )
        }
        if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Invalid quantity for variant "${variantId}". Must be an integer between 1 and 1000.`
          )
        }
        merged.set(variantId, (merged.get(variantId) ?? 0) + qty)
      }
    }

    if (merged.size === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one variant_id:quantity pair is required for social checkout handoff."
      )
    }

    return Array.from(merged.entries()).map(([variant_id, quantity]) => ({
      variant_id,
      quantity,
    }))
  }

  /**
   * Builds a validated `CheckoutHandoffResult` with a safe storefront checkout URL
   * and social attribution metadata.
   */
  buildCheckoutHandoff(
    input: CheckoutHandoffInput,
    options?: {
      cartId?: string | null
      storefrontBaseUrl?: string
    }
  ): CheckoutHandoffResult {
    const items = this.parseProductsParam(input.products_param, input.items)
    const base =
      sanitizeHttpUrl(options?.storefrontBaseUrl) ||
      sanitizeHttpUrl(this.defaultStorefrontUrl) ||
      "https://store.example.com"

    const url = new URL("/checkout", base.endsWith("/") ? base : `${base}/`)
    url.searchParams.set(
      "products",
      items.map((i) => `${i.variant_id}:${i.quantity}`).join(",")
    )

    if (options?.cartId) {
      url.searchParams.set("cart_id", options.cartId)
    }
    if (input.coupon?.trim()) {
      url.searchParams.set("coupon", input.coupon.trim())
    }
    if (input.source_platform) {
      url.searchParams.set("utm_source", input.source_platform)
      url.searchParams.set("utm_medium", "social_commerce")
    }
    if (input.source_post_id?.trim()) {
      url.searchParams.set("social_post_id", input.source_post_id.trim())
    }
    if (input.live_session_id?.trim()) {
      url.searchParams.set("live_session_id", input.live_session_id.trim())
    }
    if (input.reservation_id?.trim()) {
      url.searchParams.set("reservation_id", input.reservation_id.trim())
    }

    return {
      cart_id: options?.cartId ?? null,
      items,
      coupon: input.coupon?.trim() || null,
      reservation_id: input.reservation_id?.trim() || null,
      checkout_url: url.toString(),
      attribution: {
        source_platform: input.source_platform ?? null,
        source_post_id: input.source_post_id?.trim() || null,
        live_session_id: input.live_session_id?.trim() || null,
      },
    }
  }
}
