import type {
  TypesenseCategoryDocument,
  TypesenseCollectionDocument,
  TypesenseProductDocument,
} from "../types"

export function toUnixTimestamp(value: unknown, fallback?: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return Math.floor(value.getTime() / 1000)
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return Math.floor(parsed / 1000)
    }
  }
  return fallback ?? Math.floor(Date.now() / 1000)
}

function uniqueStrings(values: Array<unknown>): string[] {
  const seen = new Set<string>()
  for (const val of values) {
    if (val !== undefined && val !== null) {
      const str = String(val).trim()
      if (str.length > 0) {
        seen.add(str)
      }
    }
  }
  return Array.from(seen)
}

function applyLocaleTranslations(
  record: Record<string, any>,
  locale?: string
): Record<string, any> {
  if (!locale || !record) {
    return record
  }
  const translations = record.translations || record.metadata?.translations
  if (!translations) {
    return record
  }

  let localeOverride: Record<string, any> | undefined
  if (Array.isArray(translations)) {
    localeOverride = translations.find(
      (t: any) =>
        t &&
        (t.locale === locale ||
          t.language_code === locale ||
          t.locale?.startsWith(`${locale}-`))
    )
  } else if (typeof translations === "object") {
    localeOverride =
      translations[locale] ||
      translations[locale.split("-")[0]] ||
      undefined
  }

  if (!localeOverride || typeof localeOverride !== "object") {
    return record
  }

  return {
    ...record,
    ...Object.fromEntries(
      Object.entries(localeOverride).filter(
        ([k, v]) =>
          k !== "id" &&
          k !== "locale" &&
          typeof v === "string" &&
          v.trim().length > 0
      )
    ),
  }
}

export function transformProductToDocument(
  rawProduct: Record<string, any>,
  context?: { locale?: string }
): TypesenseProductDocument | null {
  if (!rawProduct || !rawProduct.id) {
    return null
  }

  const locale = context?.locale || "en"
  const product = applyLocaleTranslations(rawProduct, locale)

  const categories = Array.isArray(product.categories) ? product.categories : []
  const tags = Array.isArray(product.tags) ? product.tags : []
  const salesChannels = Array.isArray(product.sales_channels)
    ? product.sales_channels
    : []
  const variants = Array.isArray(product.variants) ? product.variants : []
  const options = Array.isArray(product.options) ? product.options : []

  const optionNames: string[] = []
  const optionValues: string[] = []
  const optionsKv: string[] = []

  for (const opt of options) {
    if (!opt) continue
    const optTitle = String(opt.title || "").trim()
    if (optTitle) {
      optionNames.push(optTitle)
    }
    const vals = Array.isArray(opt.values) ? opt.values : []
    for (const v of vals) {
      const valStr = typeof v === "string" ? v : String(v?.value || "").trim()
      if (valStr) {
        optionValues.push(valStr)
        if (optTitle) {
          optionsKv.push(`${optTitle}:${valStr}`)
        }
      }
    }
  }

  const pricesByCurrency: Record<string, number> = {}
  const allPriceAmounts: number[] = []
  let totalInventory = 0
  let anyInStock = false

  for (const variant of variants) {
    if (!variant) continue

    const qty =
      typeof variant.inventory_quantity === "number"
        ? variant.inventory_quantity
        : 0
    totalInventory += qty

    if (
      variant.manage_inventory === false ||
      variant.allow_backorder === true ||
      qty > 0
    ) {
      anyInStock = true
    }

    const vOpts = Array.isArray(variant.options) ? variant.options : []
    for (const vo of vOpts) {
      if (!vo) continue
      const valStr = String(vo.value || "").trim()
      const optTitle = String(vo.option?.title || "").trim()
      if (valStr) {
        optionValues.push(valStr)
        if (optTitle) {
          optionNames.push(optTitle)
          optionsKv.push(`${optTitle}:${valStr}`)
        }
      }
    }

    const prices = Array.isArray(variant.prices) ? variant.prices : []
    for (const p of prices) {
      if (!p || typeof p.amount !== "number") continue
      const currency = String(p.currency_code || "usd").toLowerCase()
      const amount = Number(p.amount)
      allPriceAmounts.push(amount)
      if (
        pricesByCurrency[currency] === undefined ||
        amount < pricesByCurrency[currency]
      ) {
        pricesByCurrency[currency] = amount
      }
    }

    if (
      variant.calculated_price &&
      typeof variant.calculated_price.calculated_amount === "number"
    ) {
      const calcAmount = Number(variant.calculated_price.calculated_amount)
      const calcCurr = String(
        variant.calculated_price.currency_code || "usd"
      ).toLowerCase()
      allPriceAmounts.push(calcAmount)
      if (
        pricesByCurrency[calcCurr] === undefined ||
        calcAmount < pricesByCurrency[calcCurr]
      ) {
        pricesByCurrency[calcCurr] = calcAmount
      }
    }
  }

  if (variants.length === 0) {
    anyInStock = true
  }

  const minPrice =
    allPriceAmounts.length > 0 ? Math.min(...allPriceAmounts) : 0
  const maxPrice =
    allPriceAmounts.length > 0 ? Math.max(...allPriceAmounts) : 0

  const collectionId = String(
    product.collection?.id || product.collection_id || ""
  )
  const collectionIds = uniqueStrings([
    collectionId,
    ...(Array.isArray(product.collections)
      ? product.collections.map((c: any) => c?.id)
      : []),
  ])

  const nowTs = Math.floor(Date.now() / 1000)
  const createdAtTs = toUnixTimestamp(product.created_at, nowTs)
  const updatedAtTs = toUnixTimestamp(product.updated_at, createdAtTs)

  return {
    id: String(product.id),
    title: String(product.title || ""),
    subtitle: String(product.subtitle || ""),
    description: String(product.description || ""),
    handle: String(product.handle || ""),
    status: String(product.status || "published"),
    thumbnail: String(product.thumbnail || ""),
    is_giftcard: Boolean(product.is_giftcard),
    discountable: product.discountable !== false,
    type_id: String(product.type?.id || product.type_id || ""),
    type_value: String(product.type?.value || ""),
    collection_id: collectionId,
    collection_title: String(product.collection?.title || ""),
    collection_handle: String(product.collection?.handle || ""),
    collection_ids: collectionIds,
    category_ids: uniqueStrings(categories.map((c: any) => c?.id)),
    category_names: uniqueStrings(categories.map((c: any) => c?.name)),
    category_handles: uniqueStrings(categories.map((c: any) => c?.handle)),
    tags: uniqueStrings(tags.map((t: any) => t?.value ?? t)),
    tag_ids: uniqueStrings(tags.map((t: any) => t?.id)),
    sales_channel_ids: uniqueStrings(salesChannels.map((sc: any) => sc?.id)),
    variant_ids: uniqueStrings(variants.map((v: any) => v?.id)),
    variant_titles: uniqueStrings(variants.map((v: any) => v?.title)),
    variant_skus: uniqueStrings(variants.map((v: any) => v?.sku)),
    variant_barcodes: uniqueStrings(
      variants.flatMap((v: any) => [v?.barcode, v?.ean, v?.upc])
    ),
    option_names: uniqueStrings(optionNames),
    option_values: uniqueStrings(optionValues),
    options_kv: uniqueStrings(optionsKv),
    currencies: Object.keys(pricesByCurrency),
    prices: pricesByCurrency,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: anyInStock,
    inventory_quantity: totalInventory,
    weight: typeof product.weight === "number" ? Number(product.weight) : 0,
    origin_country: String(product.origin_country || ""),
    material: String(product.material || ""),
    hs_code: String(product.hs_code || ""),
    mid_code: String(product.mid_code || ""),
    locale,
    created_at_ts: createdAtTs,
    updated_at_ts: updatedAtTs,
    ...(product.metadata && typeof product.metadata === "object"
      ? { metadata: product.metadata }
      : {}),
  }
}

export function transformCategoryToDocument(
  rawCategory: Record<string, any>,
  context?: { locale?: string }
): TypesenseCategoryDocument | null {
  if (!rawCategory || !rawCategory.id) {
    return null
  }

  const locale = context?.locale || "en"
  const category = applyLocaleTranslations(rawCategory, locale)

  const parent = category.parent_category || null
  const children = Array.isArray(category.category_children)
    ? category.category_children
    : []
  const products = Array.isArray(category.products) ? category.products : []

  const breadcrumbNames = uniqueStrings([
    parent?.name,
    category.name,
  ])
  const breadcrumbHandles = uniqueStrings([
    parent?.handle,
    category.handle,
  ])

  const nowTs = Math.floor(Date.now() / 1000)
  const createdAtTs = toUnixTimestamp(category.created_at, nowTs)
  const updatedAtTs = toUnixTimestamp(category.updated_at, createdAtTs)

  return {
    id: String(category.id),
    name: String(category.name || ""),
    description: String(category.description || ""),
    handle: String(category.handle || ""),
    is_active: category.is_active !== false,
    is_internal: Boolean(category.is_internal),
    rank: typeof category.rank === "number" ? category.rank : 0,
    parent_category_id: String(
      category.parent_category_id || parent?.id || ""
    ),
    parent_category_name: String(parent?.name || ""),
    mpath: String(category.mpath || ""),
    breadcrumb_names: breadcrumbNames,
    breadcrumb_handles: breadcrumbHandles,
    child_category_ids: uniqueStrings(children.map((c: any) => c?.id)),
    product_count:
      typeof category.product_count === "number"
        ? category.product_count
        : products.length,
    locale,
    created_at_ts: createdAtTs,
    updated_at_ts: updatedAtTs,
    ...(category.metadata && typeof category.metadata === "object"
      ? { metadata: category.metadata }
      : {}),
  }
}

export function transformCollectionToDocument(
  rawCollection: Record<string, any>,
  context?: { locale?: string }
): TypesenseCollectionDocument | null {
  if (!rawCollection || !rawCollection.id) {
    return null
  }

  const locale = context?.locale || "en"
  const collection = applyLocaleTranslations(rawCollection, locale)
  const products = Array.isArray(collection.products) ? collection.products : []

  const nowTs = Math.floor(Date.now() / 1000)
  const createdAtTs = toUnixTimestamp(collection.created_at, nowTs)
  const updatedAtTs = toUnixTimestamp(collection.updated_at, createdAtTs)

  return {
    id: String(collection.id),
    title: String(collection.title || ""),
    handle: String(collection.handle || ""),
    product_count:
      typeof collection.product_count === "number"
        ? collection.product_count
        : products.length,
    locale,
    created_at_ts: createdAtTs,
    updated_at_ts: updatedAtTs,
    ...(collection.metadata && typeof collection.metadata === "object"
      ? { metadata: collection.metadata }
      : {}),
  }
}

export function transformCustomEntityToDocument(
  rawRecord: Record<string, any>,
  context?: { locale?: string; entity?: string }
): Record<string, any> | null {
  if (!rawRecord || !rawRecord.id) {
    return null
  }

  const locale = context?.locale || "en"
  const record = applyLocaleTranslations(rawRecord, locale)
  const nowTs = Math.floor(Date.now() / 1000)

  const doc: Record<string, any> = {
    id: String(record.id),
    locale,
    created_at_ts: toUnixTimestamp(record.created_at, nowTs),
    updated_at_ts: toUnixTimestamp(
      record.updated_at,
      toUnixTimestamp(record.created_at, nowTs)
    ),
  }

  for (const [key, value] of Object.entries(record)) {
    if (key === "id" || value === undefined || value === null) {
      continue
    }
    if (value instanceof Date) {
      doc[`${key}_ts`] = toUnixTimestamp(value)
      doc[key] = value.toISOString()
    } else if (
      typeof value === "string" &&
      (key.endsWith("_at") || key.endsWith("_date"))
    ) {
      const parsed = Date.parse(value)
      if (!Number.isNaN(parsed)) {
        doc[`${key}_ts`] = Math.floor(parsed / 1000)
      }
      doc[key] = value
    } else {
      doc[key] = value
    }
  }

  return doc
}

export async function transformEntityRecord(
  entity: string,
  record: Record<string, any>,
  options?: {
    locale?: string
    customTransformer?: (
      rec: any,
      ctx?: { locale?: string; entity?: string }
    ) => any
  }
): Promise<Record<string, any> | null> {
  const locale = options?.locale || "en"
  if (typeof options?.customTransformer === "function") {
    return await options.customTransformer(record, { locale, entity })
  }
  if (entity === "products" || entity === "product") {
    return transformProductToDocument(record, { locale })
  }
  if (entity === "categories" || entity === "product_category") {
    return transformCategoryToDocument(record, { locale })
  }
  if (entity === "collections" || entity === "product_collection") {
    return transformCollectionToDocument(record, { locale })
  }
  return transformCustomEntityToDocument(record, { locale, entity })
}
