import type { OrderAddressSnapshot } from "../types"

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
])

/**
 * Formats a numeric amount in Medusa v2 major units (or minor units if normalizeMinorUnits = true).
 * In Medusa v2, order totals/unit_price are stored in major currency units (e.g., 49.99).
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode = "USD",
  locale = "en"
): string {
  const numericAmount =
    typeof amount === "string" ? parseFloat(amount) : Number(amount ?? 0)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
  const normalizedCurrency = (currencyCode || "USD").toUpperCase()
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(
    normalizedCurrency.toLowerCase()
  )

  try {
    return new Intl.NumberFormat(locale || "en", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: isZeroDecimal ? 0 : 2,
      maximumFractionDigits: isZeroDecimal ? 0 : 2,
    }).format(safeAmount)
  } catch {
    return `${normalizedCurrency} ${safeAmount.toFixed(isZeroDecimal ? 0 : 2)}`
  }
}

export function formatDate(
  dateInput: string | Date | null | undefined,
  locale = "en"
): string {
  if (!dateInput) return ""
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return String(dateInput)
  }
  try {
    return new Intl.DateTimeFormat(locale || "en", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export function formatAddressLines(
  address?: OrderAddressSnapshot | null
): string[] {
  if (!address) return []
  const lines: string[] = []
  const fullName = [address.first_name, address.last_name]
    .filter(Boolean)
    .join(" ")
    .trim()
  if (fullName) lines.push(fullName)
  if (address.company) lines.push(address.company)
  if (address.address_1) lines.push(address.address_1)
  if (address.address_2) lines.push(address.address_2)
  const cityLine = [address.postal_code, address.city, address.province]
    .filter(Boolean)
    .join(" ")
    .trim()
  if (cityLine) lines.push(cityLine)
  if (address.country_code) lines.push(address.country_code.toUpperCase())
  if (address.phone) lines.push(address.phone)
  return lines
}

/**
 * Sanitizes a filename for Content-Disposition headers and File Module storage,
 * stripping control characters, quotes, and path traversal sequences.
 */
export function sanitizeFilename(name: string, fallback = "document.pdf"): string {
  if (!name || typeof name !== "string") return fallback
  const cleaned = name
    .replace(/\.\.+/g, "-")
    .replace(/[\r\n\0"\\/<>|?*]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/[-.]{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
  return cleaned || fallback
}

/**
 * Strips executable/dangerous HTML tags and event handler attributes before passing to html-to-pdfmake.
 */
export function sanitizeHtmlForPdf(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== "string") return ""
  return rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/<link\b[^>]*>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "blocked:")
}
