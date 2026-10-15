import type {
  CreateProductPayload,
  NormalizedBarcodeProduct,
} from "../types"

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
    skuPrefix?: string
    defaultCurrencyCode?: string
    overrideTitle?: string
    overrideDescription?: string
    overridePrice?: number
    currencyCode?: string
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

  const variantTitle = normalized.quantity_label || "Default"

  return {
    title,
    subtitle: normalized.brand || normalized.publisher || null,
    description,
    handle,
    status: options.status || "draft",
    thumbnail: normalized.images[0] || null,
    images: normalized.images.map((url) => ({ url })),
    weight: normalized.weight,
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
        manage_inventory: true,
        options: {
          Format: variantTitle,
        },
        prices:
          priceAmount > 0
            ? [{ amount: priceAmount, currency_code: currencyCode }]
            : [],
      },
    ],
    metadata: {
      barcode: normalized.barcode,
      barcode_type: normalized.barcode_type,
      barcode_provider: normalized.provider,
      brand: normalized.brand,
      manufacturer: normalized.manufacturer,
      categories: normalized.categories,
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
}
