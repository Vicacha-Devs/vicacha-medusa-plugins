import { MedusaError } from "../utils/medusa-error.js"
import { escapeCsvField, escapeXml, sanitizeHttpUrl } from "../utils/security.js"
import type {
  BeforeCatalogFeedItemHook,
  CatalogFeedFormat,
  CatalogFeedItemContext,
  CatalogFeedProductItem,
  CheckoutHandoffInput,
  CheckoutHandoffLineItem,
  CheckoutHandoffResult,
} from "../types/index"

export interface GenerateCatalogFeedOptions {
  format?: CatalogFeedFormat
  channelTitle?: string
  channelLink?: string
  channelDescription?: string
  currencyCode?: string
  countryCode?: string
  regionId?: string
  salesChannelId?: string
  includeVariantOptionsInUrl?: boolean
  beforeFeedItem?: BeforeCatalogFeedItemHook
}

export interface MapMedusaProductsOptions {
  currencyCode?: string
  countryCode?: string
  regionId?: string
  salesChannelId?: string
  storefrontUrl?: string
  brandName?: string
  includeVariantOptionsInUrl?: boolean
  beforeFeedItem?: BeforeCatalogFeedItemHook
}

const RESERVED_XML_OPTION_TAGS = new Set([
  "id",
  "item_group_id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
  "availability",
  "condition",
  "price",
  "sale_price",
  "brand",
  "gtin",
  "mpn",
  "google_product_category",
  "product_type",
  "color",
  "size",
  "material",
  "gender",
  "age_group",
  "quantity_to_sell_on_facebook",
])

/**
 * Strips HTML tags and truncates text at a word boundary per Google Merchant Center limits.
 */
export function truncateAtWordBoundary(
  input: string | null | undefined,
  maxLength: number
): string {
  if (!input) return ""
  const stripped = String(input)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (stripped.length <= maxLength) {
    return stripped
  }
  const sliced = stripped.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(" ")
  if (lastSpace > Math.floor(maxLength * 0.6)) {
    return `${sliced.slice(0, lastSpace)}…`
  }
  return `${sliced}…`
}

/**
 * Generates outbound product catalog feeds (Meta/Google RSS 2.0 XML, TikTok/Meta CSV, JSON)
 * and handles Social Checkout Handoff deep-link parsing & checkout URL construction.
 */
export class CatalogFeedService {
  private readonly defaultStorefrontUrl: string
  private readonly defaultBrandName: string
  private readonly defaultCurrency: string
  private readonly defaultBeforeFeedItem?: BeforeCatalogFeedItemHook

  constructor(options?: {
    storefrontUrl?: string
    brandName?: string
    defaultCurrency?: string
    beforeFeedItem?: BeforeCatalogFeedItemHook
  }) {
    this.defaultStorefrontUrl =
      options?.storefrontUrl?.replace(/\/+$/, "") || "https://store.example.com"
    this.defaultBrandName = options?.brandName?.trim() || "Medusa Store"
    this.defaultCurrency =
      options?.defaultCurrency?.trim().toUpperCase() || "USD"
    this.defaultBeforeFeedItem = options?.beforeFeedItem
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
    format: "xml" | "csv" | "json"
  } {
    const rawFormat: CatalogFeedFormat = options?.format ?? "xml"
    const format: "xml" | "csv" | "json" =
      rawFormat === "meta_xml"
        ? "xml"
        : rawFormat === "tiktok_csv"
          ? "csv"
          : (rawFormat as "xml" | "csv" | "json")

    if (format !== "xml" && format !== "csv" && format !== "json") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unsupported catalog feed format "${String(rawFormat)}". Supported formats: xml, csv, json.`
      )
    }

    const beforeHook = options?.beforeFeedItem ?? this.defaultBeforeFeedItem
    const contextCurrency = (
      options?.currencyCode || this.defaultCurrency
    ).toUpperCase()
    const context: CatalogFeedItemContext = {
      currency_code: contextCurrency,
      country_code: options?.countryCode?.toUpperCase(),
      region_id: options?.regionId,
      sales_channel_id: options?.salesChannelId,
    }

    const normalizedItems: CatalogFeedProductItem[] = []
    for (const rawItem of items) {
      const itemWithCurrency =
        options?.currencyCode && !rawItem.currency_code
          ? { ...rawItem, currency_code: contextCurrency }
          : rawItem

      const normalized = this.normalizeFeedItem(itemWithCurrency, {
        includeVariantOptionsInUrl: options?.includeVariantOptionsInUrl,
        overrideCurrencyCode: options?.currencyCode,
      })

      if (typeof beforeHook === "function") {
        const transformed = beforeHook(normalized, {
          ...context,
          currency_code: normalized.currency_code,
        })
        if (!transformed) {
          continue
        }
        normalizedItems.push(
          this.normalizeFeedItem(transformed, {
            includeVariantOptionsInUrl: false,
          })
        )
      } else {
        normalizedItems.push(normalized)
      }
    }

    if (format === "json") {
      return {
        format: "json",
        contentType: "application/json; charset=utf-8",
        itemCount: normalizedItems.length,
        body: JSON.stringify(
          {
            title:
              options?.channelTitle || `${this.defaultBrandName} Product Feed`,
            link: options?.channelLink || this.defaultStorefrontUrl,
            currency_code: contextCurrency,
            ...(options?.countryCode
              ? { country_code: options.countryCode.toUpperCase() }
              : {}),
            ...(options?.regionId ? { region_id: options.regionId } : {}),
            ...(options?.salesChannelId
              ? { sales_channel_id: options.salesChannelId }
              : {}),
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

  /**
   * Maps raw Medusa v2 product & variant structures into `CatalogFeedProductItem[]` with
   * region/currency price selection, sales-channel inventory availability, GTIN/MPN extraction,
   * additional images, and variant option query deep-linking.
   */
  mapMedusaProductsToFeedItems(
    products: Array<Record<string, unknown>>,
    options?: MapMedusaProductsOptions
  ): CatalogFeedProductItem[] {
    const storefrontBase =
      options?.storefrontUrl?.replace(/\/+$/, "") || this.defaultStorefrontUrl
    const defaultBrand = options?.brandName?.trim() || this.defaultBrandName
    const targetCurrency = (
      options?.currencyCode || this.defaultCurrency
    ).toUpperCase()
    const targetCountry = options?.countryCode?.trim().toLowerCase()
    const targetRegionId = options?.regionId?.trim()
    const beforeHook = options?.beforeFeedItem ?? this.defaultBeforeFeedItem

    const feedItems: CatalogFeedProductItem[] = []

    for (const product of products) {
      if (!product || typeof product !== "object") continue
      const status = String(product.status || "published")
      if (status !== "published") continue

      const productId = String(product.id || "").trim()
      if (!productId) continue

      const handle = String(product.handle || productId).trim()
      const productTitle = String(product.title || productId).trim()
      const productDesc = String(
        product.description || product.subtitle || productTitle
      ).trim()

      // Extract option id -> option title mapping (e.g., opt_1 -> "Size")
      const optionTitleById = new Map<string, string>()
      if (Array.isArray(product.options)) {
        for (const opt of product.options as Array<Record<string, unknown>>) {
          if (opt?.id && opt?.title) {
            optionTitleById.set(String(opt.id), String(opt.title).trim())
          }
        }
      }

      // Extract images
      const rawImages: string[] = []
      if (typeof product.thumbnail === "string" && product.thumbnail.trim()) {
        const safeThumb = sanitizeHttpUrl(product.thumbnail.trim())
        if (safeThumb) rawImages.push(safeThumb)
      }
      if (Array.isArray(product.images)) {
        for (const img of product.images as Array<Record<string, unknown> | string>) {
          const rawUrl =
            typeof img === "string"
              ? img
              : typeof img?.url === "string"
                ? img.url
                : null
          const safeUrl = sanitizeHttpUrl(rawUrl)
          if (safeUrl && !rawImages.includes(safeUrl)) {
            rawImages.push(safeUrl)
          }
        }
      }

      const primaryImage =
        rawImages[0] || `${storefrontBase}/placeholder-product.png`
      const additionalImages = rawImages.slice(1, 11)

      // Extract product_type / category
      const productTypeObj = product.type as Record<string, unknown> | undefined
      const categoriesArr = Array.isArray(product.categories)
        ? (product.categories as Array<Record<string, unknown>>)
        : []
      const productType =
        (typeof product.product_type === "string" && product.product_type) ||
        (typeof productTypeObj?.value === "string" && productTypeObj.value) ||
        (categoriesArr[0]?.name ? String(categoriesArr[0].name) : undefined)

      const metadata = (product.metadata ?? {}) as Record<string, unknown>
      const brand =
        (typeof product.brand === "string" && product.brand) ||
        (typeof (product.brand as Record<string, unknown>)?.name === "string" &&
          String((product.brand as Record<string, unknown>).name)) ||
        (typeof metadata.brand === "string" && metadata.brand) ||
        defaultBrand

      const variants = Array.isArray(product.variants)
        ? (product.variants as Array<Record<string, unknown>>)
        : []

      for (const variant of variants) {
        if (!variant || typeof variant !== "object") continue
        const variantId = String(variant.id || "").trim()
        if (!variantId) continue

        // Resolve price & currency
        const resolvedPrice = this.resolveVariantPrice(variant, {
          currencyCode: targetCurrency,
          countryCode: targetCountry,
          regionId: targetRegionId,
        })
        if (resolvedPrice.price <= 0) {
          continue
        }

        // Extract variant options (size, color, material, etc.)
        const customOptions: Record<string, string> = {}
        if (Array.isArray(variant.options)) {
          for (const vOpt of variant.options as Array<Record<string, unknown>>) {
            const val = typeof vOpt?.value === "string" ? vOpt.value.trim() : ""
            if (!val) continue
            const optTitle =
              (typeof (vOpt.option as Record<string, unknown>)?.title ===
                "string" &&
                String((vOpt.option as Record<string, unknown>).title)) ||
              (typeof vOpt.option_id === "string" &&
                optionTitleById.get(vOpt.option_id)) ||
              (typeof vOpt.title === "string" && vOpt.title) ||
              ""
            const cleanKey = optTitle
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "_")
              .replace(/^_+|_+$/g, "")
            if (cleanKey) {
              customOptions[cleanKey] = val
            }
          }
        }

        // Availability & inventory calculation
        const manageInventory = variant.manage_inventory !== false
        const allowBackorder = Boolean(variant.allow_backorder)
        const invQty =
          typeof variant.inventory_quantity === "number"
            ? variant.inventory_quantity
            : undefined

        let availability: "in stock" | "out of stock" | "preorder" | "backorder" =
          "in stock"
        if (manageInventory && typeof invQty === "number" && invQty <= 0) {
          availability = allowBackorder ? "backorder" : "out of stock"
        }

        const variantTitle = String(variant.title || "").trim()
        const fullTitle =
          variantTitle &&
          variantTitle.toLowerCase() !== "default" &&
          variantTitle.toLowerCase() !== productTitle.toLowerCase()
            ? `${productTitle} - ${variantTitle}`
            : productTitle

        const gtin =
          (typeof variant.ean === "string" && variant.ean.trim()) ||
          (typeof variant.upc === "string" && variant.upc.trim()) ||
          (typeof variant.barcode === "string" && variant.barcode.trim()) ||
          (typeof variant.gtin === "string" && variant.gtin.trim()) ||
          undefined

        const mpn =
          (typeof variant.sku === "string" && variant.sku.trim()) ||
          (typeof variant.mpn === "string" && variant.mpn.trim()) ||
          undefined

        const rawItem: CatalogFeedProductItem = {
          id: variantId,
          item_group_id: productId,
          title: fullTitle,
          description: productDesc,
          link: `${storefrontBase}/products/${encodeURIComponent(handle)}?variant=${encodeURIComponent(variantId)}`,
          image_link: primaryImage,
          additional_image_links:
            additionalImages.length > 0 ? additionalImages : undefined,
          price: resolvedPrice.price,
          sale_price: resolvedPrice.salePrice,
          currency_code: resolvedPrice.currencyCode,
          availability,
          condition: "new",
          brand,
          inventory_quantity: invQty,
          google_product_category:
            typeof metadata.google_product_category === "string"
              ? metadata.google_product_category
              : undefined,
          product_type: productType,
          gtin,
          mpn,
          color:
            (typeof variant.color === "string" && variant.color) ||
            customOptions.color ||
            undefined,
          size:
            (typeof variant.size === "string" && variant.size) ||
            customOptions.size ||
            undefined,
          material:
            (typeof variant.material === "string" && variant.material) ||
            (typeof product.material === "string" && product.material) ||
            customOptions.material ||
            undefined,
          custom_options:
            Object.keys(customOptions).length > 0 ? customOptions : undefined,
        }

        const normalized = this.normalizeFeedItem(rawItem, {
          includeVariantOptionsInUrl:
            options?.includeVariantOptionsInUrl ?? true,
        })

        if (typeof beforeHook === "function") {
          const transformed = beforeHook(normalized, {
            currency_code: normalized.currency_code,
            country_code: targetCountry?.toUpperCase(),
            region_id: targetRegionId,
            sales_channel_id: options?.salesChannelId,
            raw_product: product,
            raw_variant: variant,
          })
          if (!transformed) continue
          feedItems.push(
            this.normalizeFeedItem(transformed, {
              includeVariantOptionsInUrl: false,
            })
          )
        } else {
          feedItems.push(normalized)
        }
      }
    }

    return feedItems
  }

  private resolveVariantPrice(
    variant: Record<string, unknown>,
    target: {
      currencyCode: string
      countryCode?: string
      regionId?: string
    }
  ): {
    price: number
    salePrice?: number | null
    currencyCode: string
  } {
    const calcPrice = variant.calculated_price as
      | Record<string, unknown>
      | number
      | undefined
    if (typeof calcPrice === "number" && calcPrice > 0) {
      return {
        price: calcPrice,
        currencyCode: target.currencyCode,
      }
    }
    if (calcPrice && typeof calcPrice === "object") {
      const calcAmount = Number(
        calcPrice.calculated_amount ?? calcPrice.amount ?? 0
      )
      const origAmount = Number(
        calcPrice.original_amount ?? calcAmount
      )
      const currency = String(
        calcPrice.currency_code || target.currencyCode
      ).toUpperCase()
      if (calcAmount > 0) {
        return {
          price: origAmount > calcAmount ? origAmount : calcAmount,
          salePrice: origAmount > calcAmount ? calcAmount : undefined,
          currencyCode: currency,
        }
      }
    }

    const prices = Array.isArray(variant.prices)
      ? (variant.prices as Array<Record<string, unknown>>)
      : []

    if (prices.length > 0) {
      const targetCurrLower = target.currencyCode.toLowerCase()
      const matched =
        prices.find(
          (p) =>
            target.regionId &&
            String(p.region_id || "") === target.regionId
        ) ||
        prices.find(
          (p) =>
            String(p.currency_code || "").toLowerCase() === targetCurrLower
        ) ||
        prices[0]

      if (matched) {
        const amount = Number(matched.amount ?? 0)
        const currency = String(
          matched.currency_code || target.currencyCode
        ).toUpperCase()
        return {
          price: amount,
          currencyCode: currency,
        }
      }
    }

    if (typeof variant.price === "number" && variant.price > 0) {
      return {
        price: variant.price,
        currencyCode: target.currencyCode,
      }
    }

    return {
      price: 0,
      currencyCode: target.currencyCode,
    }
  }

  private normalizeFeedItem(
    item: CatalogFeedProductItem,
    options?: {
      includeVariantOptionsInUrl?: boolean
      overrideCurrencyCode?: string
    }
  ): CatalogFeedProductItem {
    if (!item.id?.trim() || !item.item_group_id?.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Catalog feed item requires both id (variant_id) and item_group_id (product_id)."
      )
    }

    const currency = (
      options?.overrideCurrencyCode ||
      item.currency_code ||
      this.defaultCurrency ||
      "USD"
    ).toUpperCase()

    const baseLink =
      sanitizeHttpUrl(item.link) ||
      `${this.defaultStorefrontUrl}/products/${encodeURIComponent(item.item_group_id)}?variant=${encodeURIComponent(item.id)}`

    // Extract normalized custom options and auto-populate size/color/material
    const customOptions: Record<string, string> = {}
    if (item.custom_options && typeof item.custom_options === "object") {
      for (const [k, v] of Object.entries(item.custom_options)) {
        const cleanKey = k
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_")
          .replace(/^_+|_+$/g, "")
        if (cleanKey && typeof v === "string" && v.trim()) {
          customOptions[cleanKey] = v.trim()
        }
      }
    }

    const color = item.color?.trim() || customOptions.color || undefined
    const size = item.size?.trim() || customOptions.size || undefined
    const material = item.material?.trim() || customOptions.material || undefined

    // Append variant options as query parameters on deep link if enabled
    let finalLink = baseLink
    if (options?.includeVariantOptionsInUrl !== false) {
      const optionEntries = Object.entries({
        ...(size ? { size } : {}),
        ...(color ? { color } : {}),
        ...(material ? { material } : {}),
        ...customOptions,
      })
      if (optionEntries.length > 0) {
        try {
          const parsedUrl = new URL(baseLink)
          for (const [optKey, optVal] of optionEntries) {
            if (!parsedUrl.searchParams.has(optKey)) {
              parsedUrl.searchParams.set(optKey, optVal)
            }
          }
          finalLink = parsedUrl.toString()
        } catch {
          finalLink = baseLink
        }
      }
    }

    const safeImage =
      sanitizeHttpUrl(item.image_link) ||
      `${this.defaultStorefrontUrl}/placeholder-product.png`

    const safeAdditionalImages = Array.isArray(item.additional_image_links)
      ? item.additional_image_links
          .map((u) => sanitizeHttpUrl(u))
          .filter(
            (u): u is string => Boolean(u && u !== safeImage)
          )
          .slice(0, 10)
      : undefined

    const rawTitle = item.title?.trim() || item.id.trim()
    const rawDesc = item.description?.trim() || rawTitle

    return {
      ...item,
      id: item.id.trim(),
      item_group_id: item.item_group_id.trim(),
      title: truncateAtWordBoundary(rawTitle, 150),
      description: truncateAtWordBoundary(rawDesc, 5000),
      link: finalLink,
      image_link: safeImage,
      ...(safeAdditionalImages && safeAdditionalImages.length > 0
        ? { additional_image_links: safeAdditionalImages }
        : {}),
      currency_code: currency,
      availability: item.availability || "in stock",
      condition: item.condition || "new",
      brand: item.brand?.trim() || this.defaultBrandName,
      ...(item.product_type?.trim()
        ? { product_type: item.product_type.trim() }
        : {}),
      ...(item.gtin?.trim() ? { gtin: item.gtin.trim() } : {}),
      ...(item.mpn?.trim() ? { mpn: item.mpn.trim() } : {}),
      ...(color ? { color } : {}),
      ...(size ? { size } : {}),
      ...(material ? { material } : {}),
      ...(Object.keys(customOptions).length > 0
        ? { custom_options: customOptions }
        : {}),
    }
  }

  private renderXmlFeed(
    items: CatalogFeedProductItem[],
    options?: GenerateCatalogFeedOptions
  ): string {
    const title = escapeXml(
      options?.channelTitle || `${this.defaultBrandName} Social Catalog`
    )
    const link = escapeXml(
      sanitizeHttpUrl(options?.channelLink) || this.defaultStorefrontUrl
    )
    const description = escapeXml(
      options?.channelDescription ||
        "Automated product catalog feed for Google Merchant Center, Meta Shops (Instagram/Facebook), and TikTok Shop"
    )

    const xmlItems = items
      .map((item) => {
        const priceFormatted = `${Number(item.price || 0).toFixed(2)} ${escapeXml(item.currency_code)}`
        const salePriceTag =
          typeof item.sale_price === "number" && item.sale_price >= 0
            ? `\n      <g:sale_price>${Number(item.sale_price).toFixed(2)} ${escapeXml(item.currency_code)}</g:sale_price>`
            : ""
        const additionalImageTags = Array.isArray(item.additional_image_links)
          ? item.additional_image_links
              .slice(0, 10)
              .map(
                (imgUrl) =>
                  `\n      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`
              )
              .join("")
          : ""
        const categoryTag = item.google_product_category
          ? `\n      <g:google_product_category>${escapeXml(item.google_product_category)}</g:google_product_category>`
          : ""
        const productTypeTag = item.product_type
          ? `\n      <g:product_type>${escapeXml(item.product_type)}</g:product_type>`
          : ""
        const gtinTag = item.gtin
          ? `\n      <g:gtin>${escapeXml(item.gtin)}</g:gtin>`
          : ""
        const mpnTag = item.mpn
          ? `\n      <g:mpn>${escapeXml(item.mpn)}</g:mpn>`
          : ""
        const colorTag = item.color
          ? `\n      <g:color>${escapeXml(item.color)}</g:color>`
          : ""
        const sizeTag = item.size
          ? `\n      <g:size>${escapeXml(item.size)}</g:size>`
          : ""
        const materialTag = item.material
          ? `\n      <g:material>${escapeXml(item.material)}</g:material>`
          : ""
        const genderTag = item.gender
          ? `\n      <g:gender>${escapeXml(item.gender)}</g:gender>`
          : ""
        const ageGroupTag = item.age_group
          ? `\n      <g:age_group>${escapeXml(item.age_group)}</g:age_group>`
          : ""
        const customOptionTags = item.custom_options
          ? Object.entries(item.custom_options)
              .filter(
                ([key, val]) =>
                  Boolean(val) &&
                  !RESERVED_XML_OPTION_TAGS.has(key) &&
                  /^[a-z][a-z0-9_]{0,31}$/.test(key)
              )
              .map(
                ([key, val]) =>
                  `\n      <g:${key}>${escapeXml(val)}</g:${key}>`
              )
              .join("")
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
      <g:image_link>${escapeXml(item.image_link)}</g:image_link>${additionalImageTags}
      <g:availability>${escapeXml(item.availability)}</g:availability>
      <g:condition>${escapeXml(item.condition || "new")}</g:condition>
      <g:price>${priceFormatted}</g:price>${salePriceTag}
      <g:brand>${escapeXml(item.brand || this.defaultBrandName)}</g:brand>${gtinTag}${mpnTag}${categoryTag}${productTypeTag}${colorTag}${sizeTag}${materialTag}${genderTag}${ageGroupTag}${customOptionTags}${inventoryTag}
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
      "additional_image_link",
      "product_type",
      "gtin",
      "mpn",
      "color",
      "size",
      "material",
      "gender",
      "age_group",
    ]

    const rows = items.map((item) => {
      const priceFormatted = `${Number(item.price || 0).toFixed(2)} ${item.currency_code}`
      const salePriceFormatted =
        typeof item.sale_price === "number" && item.sale_price >= 0
          ? `${Number(item.sale_price).toFixed(2)} ${item.currency_code}`
          : ""
      const additionalImagesJoined = Array.isArray(item.additional_image_links)
        ? item.additional_image_links.slice(0, 10).join(",")
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
        escapeCsvField(additionalImagesJoined),
        escapeCsvField(item.product_type || ""),
        escapeCsvField(item.gtin || ""),
        escapeCsvField(item.mpn || ""),
        escapeCsvField(item.color || ""),
        escapeCsvField(item.size || ""),
        escapeCsvField(item.material || ""),
        escapeCsvField(item.gender || ""),
        escapeCsvField(item.age_group || ""),
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
