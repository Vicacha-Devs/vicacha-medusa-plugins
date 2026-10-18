import type {
  BarcodeLookupChainResult,
  BarcodeModuleOptions,
  BarcodeSymbology,
  EnrichmentStrategy,
  NormalizedBarcodeProduct,
  ProviderConfig,
  ProviderLookupOutcome,
} from "../types"
import { parseBarcode } from "../utils/barcode-parser"
import {
  mergeNormalizedProducts,
  normalizeStringArray,
  parseDimensionMm,
  parseWeightGrams,
} from "../utils/normalize-product"
import { validateExternalImageUrl } from "../utils/security"

const DEFAULT_USER_AGENT = "MedusaPluginBarcode/1.0 (+https://medusajs.com)"

export abstract class BaseBarcodeProvider {
  abstract readonly name: string
  readonly priority: number
  readonly timeout: number
  readonly retries: number
  protected readonly apiKey?: string
  protected readonly baseUrl?: string

  constructor(config: ProviderConfig = {}) {
    this.priority = config.priority ?? 50
    this.timeout = config.timeout ?? 5000
    this.retries = config.retries ?? 1
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl
  }

  abstract lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null>

  supportsFormat(_format: BarcodeSymbology): boolean {
    return true
  }

  protected async fetchJson<T = Record<string, unknown>>(
    url: string,
    init: RequestInit = {}
  ): Promise<T | null> {
    const maxAttempts = Math.max(0, this.retries)
    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeout)
      try {
        const headers = new Headers(init.headers || {})
        if (!headers.has("User-Agent")) {
          headers.set("User-Agent", DEFAULT_USER_AGENT)
        }
        if (!headers.has("Accept")) {
          headers.set("Accept", "application/json")
        }
        const response = await fetch(url, {
          ...init,
          headers,
          signal: controller.signal,
        })
        if (!response.ok) {
          const isRetryable =
            response.status === 429 || response.status >= 500
          if (isRetryable && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, 50 * 2 ** attempt))
            continue
          }
          return null
        }
        return (await response.json()) as T
      } catch {
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 50 * 2 ** attempt))
          continue
        }
        return null
      } finally {
        clearTimeout(timer)
      }
    }
    return null
  }
}

/**
 * Shared Open*Facts family base provider (OpenFoodFacts, OpenBeautyFacts, OpenPetFoodFacts, OpenProductsFacts)
 */
abstract class BaseOpenFactsProvider extends BaseBarcodeProvider {
  protected abstract readonly defaultDomain: string
  protected readonly country?: string

  constructor(config: ProviderConfig = {}) {
    super(config)
    this.country = config.country?.trim() || undefined
  }

  async lookup(
    barcode: string,
    _format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    const resolvedDomain =
      this.country && !this.baseUrl
        ? this.defaultDomain.replace(
            /^https:\/\/world\./i,
            `https://${encodeURIComponent(this.country.toLowerCase())}.`
          )
        : this.defaultDomain
    const host = this.baseUrl || resolvedDomain
    const url = `${host.replace(/\/$/, "")}/api/v2/product/${encodeURIComponent(
      barcode
    )}.json`

    const data = await this.fetchJson<{
      status?: number
      product?: Record<string, unknown>
    }>(url)

    if (!data || data.status !== 1 || !data.product) {
      return null
    }

    const p = data.product
    const name =
      (p.product_name as string) ||
      (p.product_name_en as string) ||
      (p.generic_name as string) ||
      ""
    if (!name.trim()) {
      return null
    }

    const images = normalizeStringArray([
      p.image_url,
      p.image_front_url,
      p.image_ingredients_url,
      p.image_nutrition_url,
    ]).filter((img) => Boolean(validateExternalImageUrl(img)))

    const categories =
      typeof p.categories === "string"
        ? p.categories
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : normalizeStringArray(p.categories_tags)

    const labels =
      typeof p.labels === "string"
        ? p.labels
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean)
        : normalizeStringArray(p.labels_tags)

    let weightGrams: number | null = null
    if (typeof p.product_quantity === "number" && Number.isFinite(p.product_quantity)) {
      weightGrams = p.product_quantity
    } else if (typeof p.product_quantity === "string") {
      const parsed = Number.parseFloat(p.product_quantity)
      if (Number.isFinite(parsed)) {
        weightGrams = parsed
      }
    }
    if (weightGrams === null) {
      weightGrams = parseWeightGrams(p.quantity)
    }

    const brands =
      typeof p.brands === "string"
        ? p.brands.split(",")[0]?.trim() || null
        : null

    return {
      barcode,
      barcode_type: _format,
      name: name.trim(),
      description:
        ((p.generic_name as string) || (p.ingredients_text as string) || "").trim() ||
        null,
      brand: brands,
      manufacturer: (p.manufacturing_places as string) || null,
      categories,
      labels,
      images,
      weight: weightGrams,
      weight_unit: weightGrams !== null ? "g" : null,
      dimensions: null,
      quantity_label: (p.quantity as string) || null,
      ingredients: (p.ingredients_text as string) || null,
      nutrition:
        p.nutriments && typeof p.nutriments === "object"
          ? (p.nutriments as Record<string, unknown>)
          : null,
      country_of_origin: (p.countries as string) || null,
      suggested_price: null,
      currency_code: null,
      isbn: null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: p,
    }
  }
}

export class OpenFoodFactsProvider extends BaseOpenFactsProvider {
  readonly name = "openfoodfacts"
  protected readonly defaultDomain = "https://world.openfoodfacts.org"
  constructor(config: ProviderConfig = {}) {
    super({ priority: 10, ...config })
  }
}

export class OpenBeautyFactsProvider extends BaseOpenFactsProvider {
  readonly name = "openbeautyfacts"
  protected readonly defaultDomain = "https://world.openbeautyfacts.org"
  constructor(config: ProviderConfig = {}) {
    super({ priority: 20, ...config })
  }
}

export class OpenPetFoodFactsProvider extends BaseOpenFactsProvider {
  readonly name = "openpetfoodfacts"
  protected readonly defaultDomain = "https://world.openpetfoodfacts.org"
  constructor(config: ProviderConfig = {}) {
    super({ priority: 25, ...config })
  }
}

export class OpenProductsFactsProvider extends BaseOpenFactsProvider {
  readonly name = "openproductsfacts"
  protected readonly defaultDomain = "https://world.openproductsfacts.org"
  constructor(config: ProviderConfig = {}) {
    super({ priority: 30, ...config })
  }
}

/**
 * Google Books API provider (prioritized automatically for ISBN-13 978/979 prefixes)
 */
export class GoogleBooksProvider extends BaseBarcodeProvider {
  readonly name = "googlebooks"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 15, ...config })
  }

  supportsFormat(format: BarcodeSymbology): boolean {
    return format === "isbn13" || format === "ean13"
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    if (!barcode.startsWith("978") && !barcode.startsWith("979") && format !== "isbn13") {
      return null
    }
    const host = this.baseUrl || "https://www.googleapis.com/books/v1/volumes"
    const keyParam = this.apiKey ? `&key=${encodeURIComponent(this.apiKey)}` : ""
    const url = `${host}?q=isbn:${encodeURIComponent(barcode)}${keyParam}`

    const data = await this.fetchJson<{
      totalItems?: number
      items?: Array<{ volumeInfo?: Record<string, unknown> }>
    }>(url)

    const info = data?.items?.[0]?.volumeInfo
    if (!info || typeof info.title !== "string" || !info.title.trim()) {
      return null
    }

    const subtitle = typeof info.subtitle === "string" ? `: ${info.subtitle}` : ""
    const imageLinks = (info.imageLinks as Record<string, string> | undefined) || {}
    const images = normalizeStringArray([
      imageLinks.thumbnail?.replace(/^http:\/\//i, "https://"),
      imageLinks.smallThumbnail?.replace(/^http:\/\//i, "https://"),
    ]).filter((img) => Boolean(validateExternalImageUrl(img)))

    const authors = normalizeStringArray(info.authors)
    const categories = normalizeStringArray(info.categories)

    return {
      barcode,
      barcode_type: "isbn13",
      name: `${info.title.trim()}${subtitle}`,
      description: typeof info.description === "string" ? info.description : null,
      brand: typeof info.publisher === "string" ? info.publisher : authors[0] || null,
      manufacturer: typeof info.publisher === "string" ? info.publisher : null,
      categories,
      images,
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label:
        typeof info.pageCount === "number" ? `${info.pageCount} pages` : null,
      ingredients: null,
      nutrition: null,
      country_of_origin: typeof info.language === "string" ? info.language : null,
      suggested_price: null,
      currency_code: null,
      isbn: barcode,
      authors,
      publisher: typeof info.publisher === "string" ? info.publisher : null,
      published_date:
        typeof info.publishedDate === "string" ? info.publishedDate : null,
      page_count: typeof info.pageCount === "number" ? info.pageCount : null,
      provider: this.name,
      raw_data: info,
    }
  }
}

/**
 * OpenLibrary API provider (Free, keyless ISBN / book metadata)
 */
export class OpenLibraryProvider extends BaseBarcodeProvider {
  readonly name = "openlibrary"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 18, ...config })
  }

  supportsFormat(format: BarcodeSymbology): boolean {
    return format === "isbn13" || format === "ean13"
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    if (!barcode.startsWith("978") && !barcode.startsWith("979") && format !== "isbn13") {
      return null
    }
    const bibKey = `ISBN:${barcode}`
    const host = this.baseUrl || "https://openlibrary.org/api/books"
    const url = `${host}?bibkeys=${encodeURIComponent(
      bibKey
    )}&format=json&jscmd=data`

    const data = await this.fetchJson<Record<string, Record<string, unknown>>>(url)
    const book = data?.[bibKey]
    if (!book || typeof book.title !== "string" || !book.title.trim()) {
      return null
    }

    const cover = (book.cover as Record<string, string> | undefined) || {}
    const images = normalizeStringArray([
      cover.large,
      cover.medium,
      cover.small,
    ]).filter((img) => Boolean(validateExternalImageUrl(img)))

    const authors = Array.isArray(book.authors)
      ? book.authors
          .map((a) =>
            a && typeof a === "object" && "name" in a ? String(a.name) : ""
          )
          .filter(Boolean)
      : []

    const publishers = Array.isArray(book.publishers)
      ? book.publishers
          .map((p) =>
            p && typeof p === "object" && "name" in p ? String(p.name) : ""
          )
          .filter(Boolean)
      : []

    const subjects = Array.isArray(book.subjects)
      ? book.subjects
          .map((s) =>
            s && typeof s === "object" && "name" in s ? String(s.name) : ""
          )
          .filter(Boolean)
          .slice(0, 8)
      : []

    return {
      barcode,
      barcode_type: "isbn13",
      name: book.title.trim(),
      description: typeof book.notes === "string" ? book.notes : null,
      brand: publishers[0] || authors[0] || null,
      manufacturer: publishers[0] || null,
      categories: subjects,
      images,
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label:
        typeof book.number_of_pages === "number"
          ? `${book.number_of_pages} pages`
          : null,
      ingredients: null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: null,
      currency_code: null,
      isbn: barcode,
      authors,
      publisher: publishers[0] || null,
      published_date:
        typeof book.publish_date === "string" ? book.publish_date : null,
      page_count:
        typeof book.number_of_pages === "number" ? book.number_of_pages : null,
      provider: this.name,
      raw_data: book,
    }
  }
}

/**
 * Brocade.io Open GTIN Database provider (Free, keyless general product catalog)
 */
export class BrocadeProvider extends BaseBarcodeProvider {
  readonly name = "brocade"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 35, ...config })
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    const host = this.baseUrl || "https://www.brocade.io/api/items"
    const url = `${host.replace(/\/$/, "")}/${encodeURIComponent(barcode)}`

    const data = await this.fetchJson<Record<string, unknown>>(url)
    if (!data || typeof data.name !== "string" || !data.name.trim()) {
      return null
    }

    return {
      barcode,
      barcode_type: format,
      name: data.name.trim(),
      description:
        typeof data.properties === "string" ? data.properties : null,
      brand: typeof data.brand_name === "string" ? data.brand_name : null,
      manufacturer: typeof data.brand_name === "string" ? data.brand_name : null,
      categories: [],
      images: [],
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label: typeof data.size === "string" ? data.size : null,
      ingredients: null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: null,
      currency_code: null,
      isbn: null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: data,
    }
  }
}

/**
 * UPCitemdb API provider (supports free trial endpoint or paid v1 endpoint with API key)
 */
export class UpcItemDbProvider extends BaseBarcodeProvider {
  readonly name = "upcitemdb"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 40, ...config })
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    const endpoint = this.apiKey
      ? `${this.baseUrl || "https://api.upcitemdb.com/prod/v1"}/lookup?upc=${encodeURIComponent(
          barcode
        )}`
      : `${
          this.baseUrl || "https://api.upcitemdb.com/prod/trial"
        }/lookup?upc=${encodeURIComponent(barcode)}`

    const headers: Record<string, string> = {}
    if (this.apiKey) {
      headers.user_key = this.apiKey
      headers.key_type = "3scale"
    }

    const data = await this.fetchJson<{
      code?: string
      items?: Array<Record<string, unknown>>
    }>(endpoint, { headers })

    const item = data?.items?.[0]
    if (!item || typeof item.title !== "string" || !item.title.trim()) {
      return null
    }

    const images = normalizeStringArray(item.images).filter((img) =>
      Boolean(validateExternalImageUrl(img))
    )
    const categories =
      typeof item.category === "string"
        ? item.category
            .split(">")
            .map((c) => c.trim())
            .filter(Boolean)
        : []

    const lowestPrice =
      typeof item.lowest_recorded_price === "number"
        ? item.lowest_recorded_price
        : null

    const weightGrams = parseWeightGrams(item.weight || item.size)
    const parsedDims = parseDimensionMm(item.dimension)

    return {
      barcode,
      barcode_type: format,
      name: item.title.trim(),
      description:
        typeof item.description === "string" ? item.description.trim() : null,
      brand: typeof item.brand === "string" ? item.brand.trim() : null,
      manufacturer: typeof item.brand === "string" ? item.brand.trim() : null,
      categories,
      images,
      weight: weightGrams,
      weight_unit: weightGrams !== null ? "g" : null,
      length: parsedDims.length,
      width: parsedDims.width,
      height: parsedDims.height,
      dimensions:
        typeof item.dimension === "string" ? item.dimension : null,
      quantity_label: typeof item.size === "string" ? item.size : null,
      ingredients: null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: lowestPrice,
      currency_code:
        typeof item.currency === "string" && item.currency
          ? item.currency.toUpperCase()
          : "USD",
      isbn: typeof item.isbn === "string" ? item.isbn : null,
      authors: [],
      publisher: typeof item.publisher === "string" ? item.publisher : null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: item,
    }
  }
}

/**
 * EAN-Search.org commercial API provider (requires API token)
 */
export class EanSearchProvider extends BaseBarcodeProvider {
  readonly name = "eansearch"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 60, ...config })
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    if (!this.apiKey) {
      return null
    }
    const host = this.baseUrl || "https://api.ean-search.org/api"
    const url = `${host}?token=${encodeURIComponent(
      this.apiKey
    )}&op=barcode-lookup&format=json&ean=${encodeURIComponent(barcode)}`

    const data = await this.fetchJson<Array<Record<string, unknown>>>(url)
    const item = Array.isArray(data) ? data[0] : null
    if (!item || typeof item.name !== "string" || !item.name.trim()) {
      return null
    }

    return {
      barcode,
      barcode_type: format,
      name: item.name.trim(),
      description: null,
      brand: null,
      manufacturer:
        typeof item.issuingCountry === "string" ? item.issuingCountry : null,
      categories: normalizeStringArray([item.categoryName]),
      images: [],
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label: null,
      ingredients: null,
      nutrition: null,
      country_of_origin:
        typeof item.issuingCountry === "string" ? item.issuingCountry : null,
      suggested_price: null,
      currency_code: null,
      isbn: null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: item,
    }
  }
}

/**
 * BarcodeLookup.com commercial API provider (requires API key)
 */
export class BarcodeLookupProvider extends BaseBarcodeProvider {
  readonly name = "barcodelookup"

  constructor(config: ProviderConfig = {}) {
    super({ priority: 70, ...config })
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    if (!this.apiKey) {
      return null
    }
    const host = this.baseUrl || "https://api.barcodelookup.com/v3/products"
    const url = `${host}?barcode=${encodeURIComponent(
      barcode
    )}&formatted=y&key=${encodeURIComponent(this.apiKey)}`

    const data = await this.fetchJson<{
      products?: Array<Record<string, unknown>>
    }>(url)
    const item = data?.products?.[0]
    if (!item || typeof item.title !== "string" || !item.title.trim()) {
      return null
    }

    const images = normalizeStringArray(item.images).filter((img) =>
      Boolean(validateExternalImageUrl(img))
    )

    const weightGrams = parseWeightGrams(item.weight || item.size)
    const parsedDims = parseDimensionMm(item.size || item.dimension)

    return {
      barcode,
      barcode_type: format,
      name: item.title.trim(),
      description:
        typeof item.description === "string" ? item.description.trim() : null,
      brand: typeof item.brand === "string" ? item.brand.trim() : null,
      manufacturer:
        typeof item.manufacturer === "string" ? item.manufacturer.trim() : null,
      categories:
        typeof item.category === "string"
          ? item.category
              .split(">")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
      images,
      weight: weightGrams,
      weight_unit: weightGrams !== null ? "g" : null,
      length: parsedDims.length,
      width: parsedDims.width,
      height: parsedDims.height,
      dimensions: typeof item.size === "string" ? item.size : null,
      quantity_label: typeof item.size === "string" ? item.size : null,
      ingredients:
        typeof item.ingredients === "string" ? item.ingredients : null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: null,
      currency_code: null,
      isbn: null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: item,
    }
  }
}

/**
 * Registry of active barcode lookup providers ordered by priority.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, BaseBarcodeProvider>()

  register(provider: BaseBarcodeProvider): this {
    this.providers.set(provider.name, provider)
    return this
  }

  unregister(name: string): boolean {
    return this.providers.delete(name)
  }

  get(name: string): BaseBarcodeProvider | undefined {
    return this.providers.get(name)
  }

  getAll(): BaseBarcodeProvider[] {
    return Array.from(this.providers.values()).sort(
      (a, b) => a.priority - b.priority
    )
  }

  getProviderNames(): string[] {
    return this.getAll().map((p) => p.name)
  }

  /**
   * Returns providers ordered for a specific barcode, promoting book/ISBN
   * providers (`googlebooks`, `openlibrary`) to the front when scanning 978/979 ISBNs.
   */
  getOrderedForBarcode(
    barcode: string,
    format: BarcodeSymbology,
    preferredProviders?: string[]
  ): BaseBarcodeProvider[] {
    const all = this.getAll().filter((p) => p.supportsFormat(format))

    if (preferredProviders && preferredProviders.length > 0) {
      const preferredSet = new Set(preferredProviders)
      return all.filter((p) => preferredSet.has(p.name))
    }

    const isIsbn =
      format === "isbn13" ||
      barcode.startsWith("978") ||
      barcode.startsWith("979")

    if (!isIsbn) {
      return all
    }

    return [...all].sort((a, b) => {
      const aIsBook = a.name === "googlebooks" || a.name === "openlibrary" ? 0 : 1
      const bIsBook = b.name === "googlebooks" || b.name === "openlibrary" ? 0 : 1
      if (aIsBook !== bIsBook) return aIsBook - bIsBook
      return a.priority - b.priority
    })
  }
}

/**
 * Creates a default ProviderRegistry with all 10 built-in providers configured.
 */
export function createDefaultProviderRegistry(
  options: BarcodeModuleOptions = {}
): ProviderRegistry {
  const cfg = options.providers || {}
  const timeout = options.requestTimeoutMs ?? 5000
  const registry = new ProviderRegistry()

  if (cfg.openFoodFacts?.enabled !== false) {
    registry.register(new OpenFoodFactsProvider({ timeout, ...cfg.openFoodFacts }))
  }
  if (cfg.googleBooks?.enabled !== false) {
    registry.register(new GoogleBooksProvider({ timeout, ...cfg.googleBooks }))
  }
  if (cfg.openLibrary?.enabled !== false) {
    registry.register(new OpenLibraryProvider({ timeout, ...cfg.openLibrary }))
  }
  if (cfg.openBeautyFacts?.enabled !== false) {
    registry.register(
      new OpenBeautyFactsProvider({ timeout, ...cfg.openBeautyFacts })
    )
  }
  if (cfg.openPetFoodFacts?.enabled !== false) {
    registry.register(
      new OpenPetFoodFactsProvider({ timeout, ...cfg.openPetFoodFacts })
    )
  }
  if (cfg.openProductsFacts?.enabled !== false) {
    registry.register(
      new OpenProductsFactsProvider({ timeout, ...cfg.openProductsFacts })
    )
  }
  if (cfg.brocade?.enabled !== false) {
    registry.register(new BrocadeProvider({ timeout, ...cfg.brocade }))
  }
  if (cfg.upcItemDb?.enabled !== false) {
    registry.register(new UpcItemDbProvider({ timeout, ...cfg.upcItemDb }))
  }
  if (cfg.eanSearch?.enabled !== false && cfg.eanSearch?.apiKey) {
    registry.register(new EanSearchProvider({ timeout, ...cfg.eanSearch }))
  }
  if (cfg.barcodeLookup?.enabled !== false && cfg.barcodeLookup?.apiKey) {
    registry.register(new BarcodeLookupProvider({ timeout, ...cfg.barcodeLookup }))
  }

  return registry
}

/**
 * Executes the multi-provider lookup chain using either `first-hit` or `deep-merge` strategy.
 */
export async function runProviderLookupChain(
  rawBarcode: string,
  registry: ProviderRegistry,
  options: {
    strategy?: EnrichmentStrategy
    preferredProviders?: string[]
  } = {}
): Promise<BarcodeLookupChainResult> {
  const parsed = parseBarcode(rawBarcode)
  const strategy = options.strategy || "first-hit"
  const providers = registry.getOrderedForBarcode(
    parsed.normalized,
    parsed.type,
    options.preferredProviders
  )

  const outcomes: ProviderLookupOutcome[] = []
  const hits: NormalizedBarcodeProduct[] = []

  for (const provider of providers) {
    const start = Date.now()
    try {
      const product = await provider.lookup(parsed.normalized, parsed.type)
      const durationMs = Date.now() - start
      outcomes.push({
        provider: provider.name,
        found: Boolean(product),
        durationMs,
        product,
      })

      if (product) {
        hits.push(product)
        if (strategy === "first-hit") {
          break
        }
      }
    } catch (err) {
      outcomes.push({
        provider: provider.name,
        found: false,
        durationMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Provider lookup failed",
      })
    }
  }

  const mergedProduct =
    strategy === "deep-merge" ? mergeNormalizedProducts(hits) : hits[0] || null

  return {
    barcode: parsed.normalized,
    parsed,
    found: Boolean(mergedProduct),
    cached: false,
    strategy,
    product: mergedProduct,
    outcomes,
  }
}

/**
 * Safely downloads an external product image buffer with SSRF & size checks (max 8MB).
 */
export async function downloadProductImageBuffer(
  imageUrl: string,
  timeoutMs = 5000
): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
  const safeUrl = validateExternalImageUrl(imageUrl)
  if (!safeUrl) {
    return null
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(safeUrl, {
      headers: { "User-Agent": DEFAULT_USER_AGENT },
      signal: controller.signal,
    })
    if (!response.ok) {
      return null
    }
    const contentType = response.headers.get("content-type") || "image/jpeg"
    if (!contentType.startsWith("image/")) {
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > 8 * 1024 * 1024) {
      return null
    }
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
      ? "webp"
      : "jpg"
    const filename = `barcode-${Date.now()}.${ext}`
    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType: contentType.split(";")[0] || "image/jpeg",
      filename,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
