import type {
  CreateProductPayload,
  NormalizedBarcodeProduct,
  VariantPriceInput,
} from "../types"

export const CATEGORY_ALIASES: Record<string, string> = {
  food: "Food & Beverages",
  beverage: "Food & Beverages",
  beverages: "Food & Beverages",
  drink: "Food & Beverages",
  drinks: "Food & Beverages",
  grocery: "Food & Beverages",
  electronics: "Electronics",
  electronic: "Electronics",
  health: "Health & Beauty",
  beauty: "Health & Beauty",
  cosmetics: "Health & Beauty",
  "personal care": "Health & Beauty",
  cleaning: "Home & Garden",
  home: "Home & Garden",
  garden: "Home & Garden",
  clothing: "Apparel",
  apparel: "Apparel",
  fashion: "Apparel",
  toys: "Toys & Games",
  games: "Toys & Games",
  sports: "Sports & Outdoors",
  outdoors: "Sports & Outdoors",
  automotive: "Automotive",
  office: "Office Supplies",
  pet: "Pet Supplies",
  book: "Books & Media",
  books: "Books & Media",
}

function toTitleCase(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/**
 * Normalizes a raw category string into a canonical retail category or title-cased label.
 */
export function normalizeCategory(raw: string): string {
  const trimmed = String(raw ?? "").trim()
  if (!trimmed) {
    return ""
  }
  const cleanPrefix = trimmed.replace(/^[a-z]{2}:/i, "").replace(/-/g, " ").trim()
  const lower = cleanPrefix.toLowerCase()
  for (const [key, canonical] of Object.entries(CATEGORY_ALIASES)) {
    if (lower.includes(key)) {
      return canonical
    }
  }
  return toTitleCase(cleanPrefix)
}

/**
 * Parses a human-readable weight or volume string into integer grams.
 * Examples: "400g" -> 400, "1.5 kg" -> 1500, "500ml" -> 500, "16 oz" -> 454, "2 lb" -> 907
 */
export function parseWeightGrams(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.round(raw)
  }
  if (typeof raw !== "string") {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  const unitMatch =
    /(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|g|grams?|mg|milligrams?|lb|lbs|pounds?|oz|ounces?|ml|milliliters?|cl|centiliters?|l|liters?)\b/i.exec(
      trimmed
    )
  if (unitMatch) {
    const val = Number.parseFloat((unitMatch[1] || "0").replace(",", "."))
    if (!Number.isFinite(val) || val <= 0) {
      return null
    }
    const unit = (unitMatch[2] || "g").toLowerCase()
    if (unit === "kg" || unit.startsWith("kilogram") || unit === "l" || unit.startsWith("liter")) {
      return Math.round(val * 1000)
    }
    if (unit === "g" || unit.startsWith("gram") || unit === "ml" || unit.startsWith("milliliter")) {
      return Math.round(val)
    }
    if (unit === "cl" || unit.startsWith("centiliter")) {
      return Math.round(val * 10)
    }
    if (unit === "mg" || unit.startsWith("milligram")) {
      return Math.max(1, Math.round(val / 1000))
    }
    if (unit === "lb" || unit === "lbs" || unit.startsWith("pound")) {
      return Math.round(val * 453.59237)
    }
    if (unit === "oz" || unit.startsWith("ounce")) {
      return Math.round(val * 28.34952)
    }
  }

  if (/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    const num = Number.parseFloat(trimmed.replace(",", "."))
    if (Number.isFinite(num) && num > 0) {
      return Math.round(num)
    }
  }

  return null
}

/**
 * Parses a human-readable 3D dimension string into millimeters (`{ length, width, height }`).
 * Examples: "10 x 5 x 20 cm" -> { length: 100, width: 50, height: 200 }, "4 x 2 x 8 in" -> { length: 102, width: 51, height: 203 }
 */
export function parseDimensionMm(raw: unknown): {
  length: number | null
  width: number | null
  height: number | null
} {
  if (typeof raw !== "string" || !raw.trim()) {
    return { length: null, width: null, height: null }
  }
  const match =
    /(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m|in|inch|inches|")?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm|m|in|inch|inches|")?\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*(mm|millimeters?|cm|centimeters?|m|meters?|in|inch|inches|")?/i.exec(
      raw
    )
  if (!match) {
    return { length: null, width: null, height: null }
  }

  const d1 = Number.parseFloat((match[1] || "0").replace(",", "."))
  const d2 = Number.parseFloat((match[2] || "0").replace(",", "."))
  const d3 = Number.parseFloat((match[3] || "0").replace(",", "."))
  if (
    !Number.isFinite(d1) ||
    !Number.isFinite(d2) ||
    !Number.isFinite(d3) ||
    d1 <= 0 ||
    d2 <= 0 ||
    d3 <= 0
  ) {
    return { length: null, width: null, height: null }
  }

  const unit = (match[4] || "mm").toLowerCase()
  let factor = 1
  if (unit === "cm" || unit.startsWith("centimeter")) {
    factor = 10
  } else if (unit === "m" || unit.startsWith("meter")) {
    factor = 1000
  } else if (unit === "in" || unit.startsWith("inch") || unit === '"') {
    factor = 25.4
  }

  return {
    length: Math.round(d1 * factor),
    width: Math.round(d2 * factor),
    height: Math.round(d3 * factor),
  }
}

/**
 * Generates a URL-safe product handle from a product name and barcode.
 */
export function slugifyProductHandle(name: string, barcode: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)

  const suffix = barcode
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toLowerCase()

  if (!base) {
    return `item-${suffix || "barcode"}`
  }
  return suffix ? `${base}-${suffix}` : base
}

/**
 * Normalizes raw category arrays/strings into a clean deduplicated array.
 */
export function normalizeStringArray(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .map((item) => String(item ?? "").trim())
          .filter((item) => item.length > 0)
      )
    )
  }
  if (typeof input === "string") {
    return Array.from(
      new Set(
        input
          .split(/[,;>|]+/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      )
    )
  }
  return []
}

/**
 * Deep-merges multiple `NormalizedBarcodeProduct` results from the provider chain.
 * Priority is ordered from first to last; missing fields in earlier providers are
 * backfilled from lower-priority providers, and image/category/author lists are deduplicated.
 */
export function mergeNormalizedProducts(
  products: NormalizedBarcodeProduct[]
): NormalizedBarcodeProduct | null {
  if (products.length === 0) {
    return null
  }
  if (products.length === 1) {
    return products[0]
  }

  const primary = products[0]
  const mergedCategories = new Set<string>(primary.categories)
  const mergedImages = new Set<string>(primary.images)
  const mergedAuthors = new Set<string>(primary.authors)
  const mergedLabels = new Set<string>(primary.labels || [])
  const mergedProviders: string[] = [primary.provider]
  const mergedRawData: Record<string, unknown> = {
    [primary.provider]: primary.raw_data,
  }

  let description = primary.description
  let brand = primary.brand
  let manufacturer = primary.manufacturer
  let weight = primary.weight
  let weightUnit = primary.weight_unit
  let dimensions = primary.dimensions
  let length = primary.length ?? null
  let width = primary.width ?? null
  let height = primary.height ?? null
  let quantityLabel = primary.quantity_label
  let ingredients = primary.ingredients
  let nutrition = primary.nutrition
  let countryOfOrigin = primary.country_of_origin
  let suggestedPrice = primary.suggested_price
  let currencyCode = primary.currency_code
  let isbn = primary.isbn
  let publisher = primary.publisher
  let publishedDate = primary.published_date
  let pageCount = primary.page_count

  for (let i = 1; i < products.length; i++) {
    const next = products[i]
    mergedProviders.push(next.provider)
    mergedRawData[next.provider] = next.raw_data

    for (const cat of next.categories) mergedCategories.add(cat)
    for (const img of next.images) mergedImages.add(img)
    for (const author of next.authors) mergedAuthors.add(author)
    for (const lbl of next.labels || []) mergedLabels.add(lbl)

    if (!description || (next.description && next.description.length > description.length)) {
      description = next.description
    }
    if (!brand && next.brand) brand = next.brand
    if (!manufacturer && next.manufacturer) manufacturer = next.manufacturer
    if (weight === null && next.weight !== null) {
      weight = next.weight
      weightUnit = next.weight_unit
    }
    if (!dimensions && next.dimensions) dimensions = next.dimensions
    if (length === null && next.length != null) length = next.length
    if (width === null && next.width != null) width = next.width
    if (height === null && next.height != null) height = next.height
    if (!quantityLabel && next.quantity_label) quantityLabel = next.quantity_label
    if (!ingredients && next.ingredients) ingredients = next.ingredients
    if (!nutrition && next.nutrition) nutrition = next.nutrition
    if (!countryOfOrigin && next.country_of_origin) {
      countryOfOrigin = next.country_of_origin
    }
    if (suggestedPrice === null && next.suggested_price !== null) {
      suggestedPrice = next.suggested_price
      currencyCode = next.currency_code || currencyCode
    }
    if (!isbn && next.isbn) isbn = next.isbn
    if (!publisher && next.publisher) publisher = next.publisher
    if (!publishedDate && next.published_date) publishedDate = next.published_date
    if (pageCount === null && next.page_count !== null) pageCount = next.page_count
  }

  return {
    ...primary,
    description,
    brand,
    manufacturer,
    categories: Array.from(mergedCategories),
    images: Array.from(mergedImages),
    weight,
    weight_unit: weightUnit,
    dimensions,
    length,
    width,
    height,
    labels: mergedLabels.size > 0 ? Array.from(mergedLabels) : primary.labels,
    quantity_label: quantityLabel,
    ingredients,
    nutrition,
    country_of_origin: countryOfOrigin,
    suggested_price: suggestedPrice,
    currency_code: currencyCode,
    isbn,
    authors: Array.from(mergedAuthors),
    publisher,
    published_date: publishedDate,
    page_count: pageCount,
    provider: mergedProviders.join("+"),
    raw_data: mergedRawData,
  }
}

/**
 * Maps a `NormalizedBarcodeProduct` into a Medusa v2 `CreateProductPayload`
 * with synced `barcode`, `ean`, and `upc` variant fields.
 */
export function mapToMedusaCreateProduct(
  normalized: NormalizedBarcodeProduct,
  options: {
    status?: "draft" | "published"
    publishImmediately?: boolean
    skuPrefix?: string
    defaultCurrencyCode?: string
    overrideTitle?: string
    overrideDescription?: string
    overridePrice?: number
    currencyCode?: string
    prices?: VariantPriceInput[]
    salesChannelIds?: string[]
    categoryIds?: string[]
    collectionId?: string
  } = {}
): CreateProductPayload {
  const title = (options.overrideTitle || normalized.name || `Product ${normalized.barcode}`).trim()
  const description =
    options.overrideDescription ??
    normalized.description ??
    (normalized.ingredients ? `Ingredients: ${normalized.ingredients}` : null)

  const handle = slugifyProductHandle(title, normalized.barcode)
  const skuPrefix = options.skuPrefix || "GTIN"
  const sku = `${skuPrefix}-${normalized.barcode}`

  const cleanDigits = normalized.barcode.replace(/\D/g, "")
  const ean = cleanDigits.length === 13 ? cleanDigits : null
  const upc =
    cleanDigits.length === 12
      ? cleanDigits
      : cleanDigits.length === 13 && cleanDigits.startsWith("0")
      ? cleanDigits.slice(1)
      : null

  const priceAmount =
    typeof options.overridePrice === "number"
      ? options.overridePrice
      : typeof normalized.suggested_price === "number" && normalized.suggested_price > 0
      ? normalized.suggested_price
      : 0

  const currencyCode = (
    options.currencyCode ||
    normalized.currency_code ||
    options.defaultCurrencyCode ||
    "usd"
  ).toLowerCase()

  const variantPrices: Array<{ amount: number; currency_code: string }> = []
  if (Array.isArray(options.prices) && options.prices.length > 0) {
    for (const p of options.prices) {
      if (p && typeof p.amount === "number" && p.amount >= 0 && p.currency_code) {
        variantPrices.push({
          amount: p.amount,
          currency_code: p.currency_code.toLowerCase(),
        })
      }
    }
  }
  if (variantPrices.length === 0 && priceAmount > 0) {
    variantPrices.push({ amount: priceAmount, currency_code: currencyCode })
  }

  const resolvedWeight =
    normalized.weight ?? parseWeightGrams(normalized.quantity_label)
  const parsedDims = parseDimensionMm(normalized.dimensions)
  const resolvedLength = normalized.length ?? parsedDims.length
  const resolvedWidth = normalized.width ?? parsedDims.width
  const resolvedHeight = normalized.height ?? parsedDims.height

  const normalizedCategories = Array.from(
    new Set(
      normalized.categories
        .map((c) => normalizeCategory(c))
        .filter((c) => c.length > 0)
    )
  )

  const variantTitle = normalized.quantity_label || "Default"
  const resolvedStatus: "draft" | "published" = options.publishImmediately
    ? "published"
    : options.status || "draft"

  const payload: CreateProductPayload = {
    title,
    subtitle: normalized.brand || normalized.publisher || null,
    description,
    handle,
    status: resolvedStatus,
    thumbnail: normalized.images[0] || null,
    images: normalized.images.map((url) => ({ url })),
    weight: resolvedWeight,
    length: resolvedLength,
    width: resolvedWidth,
    height: resolvedHeight,
    origin_country: normalized.country_of_origin
      ? normalized.country_of_origin.slice(0, 2).toLowerCase()
      : null,
    options: [
      {
        title: "Format",
        values: [variantTitle],
      },
    ],
    variants: [
      {
        title: variantTitle,
        sku,
        barcode: normalized.barcode,
        ean,
        upc,
        weight: resolvedWeight,
        length: resolvedLength,
        width: resolvedWidth,
        height: resolvedHeight,
        manage_inventory: true,
        options: {
          Format: variantTitle,
        },
        prices: variantPrices,
      },
    ],
    metadata: {
      barcode: normalized.barcode,
      barcode_type: normalized.barcode_type,
      barcode_provider: normalized.provider,
      brand: normalized.brand,
      manufacturer: normalized.manufacturer,
      categories: normalized.categories,
      normalized_categories: normalizedCategories,
      labels: normalized.labels ?? [],
      quantity_label: normalized.quantity_label,
      ingredients: normalized.ingredients,
      nutrition: normalized.nutrition,
      isbn: normalized.isbn,
      authors: normalized.authors,
      publisher: normalized.publisher,
      published_date: normalized.published_date,
      page_count: normalized.page_count,
    },
  }

  if (options.collectionId) {
    payload.collection_id = options.collectionId
  }
  if (Array.isArray(options.categoryIds) && options.categoryIds.length > 0) {
    payload.categories = options.categoryIds.map((id) => ({ id }))
  }
  if (
    Array.isArray(options.salesChannelIds) &&
    options.salesChannelIds.length > 0
  ) {
    payload.sales_channels = options.salesChannelIds.map((id) => ({ id }))
  }

  return payload
}

