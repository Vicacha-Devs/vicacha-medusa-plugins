import type { DocumentType, NumberingTokens } from "../../../types"

export type { NumberingTokens } from "../../../types"

export const DEFAULT_PREFIX_BY_TYPE: Record<DocumentType, string> = {
  invoice: "INV",
  packing_slip: "PS",
  credit_note: "CN",
  receipt: "RCP",
}

export const DEFAULT_FORMAT_BY_TYPE: Record<DocumentType, string> = {
  invoice: "INV-{year}-{number}",
  packing_slip: "PS-{year}-{number}",
  credit_note: "CN-{year}-{number}",
  receipt: "RCP-{year}-{number}",
}

/**
 * Formats a sequential document number using tokens:
 * - `{number}`: zero-padded sequence number (e.g., `00042`)
 * - `{prefix}`: configured prefix (e.g., `INV`, `PS`, `CN`, `RCP`)
 * - `{year}`: 4-digit year (e.g., `2026`)
 * - `{short_year}`: 2-digit year (e.g., `26`)
 * - `{month}`: 2-digit month (`01`–`12`)
 * - `{day}`: 2-digit day (`01`–`31`)
 * - `{order_display_id}`: Medusa order display_id
 */
export function formatDocumentNumber(
  formatPattern: string | null | undefined,
  tokens: NumberingTokens,
  padding = 5,
  referenceDate: Date = new Date()
): string {
  const safePadding = Math.max(1, Math.min(12, Math.floor(padding || 5)))
  const paddedNumber = String(Math.max(1, Math.floor(tokens.number))).padStart(
    safePadding,
    "0"
  )

  const yearStr = String(tokens.year ?? referenceDate.getUTCFullYear())
  const shortYearStr = yearStr.slice(-2)
  const monthStr = String(
    tokens.month ?? referenceDate.getUTCMonth() + 1
  ).padStart(2, "0")
  const dayStr = String(tokens.day ?? referenceDate.getUTCDate()).padStart(
    2,
    "0"
  )
  const prefixStr = (tokens.prefix ?? "DOC").trim()
  const orderDisplayIdStr =
    tokens.order_display_id !== undefined && tokens.order_display_id !== null
      ? String(tokens.order_display_id)
      : "0"

  const pattern =
    formatPattern && formatPattern.trim().length > 0
      ? formatPattern.trim()
      : `${prefixStr}-{year}-{number}`

  let formatted = pattern
    .replace(/\{number\}/gi, paddedNumber)
    .replace(/\{prefix\}/gi, prefixStr)
    .replace(/\{year\}/gi, yearStr)
    .replace(/\{short_year\}/gi, shortYearStr)
    .replace(/\{month\}/gi, monthStr)
    .replace(/\{day\}/gi, dayStr)
    .replace(/\{order_display_id\}/gi, orderDisplayIdStr)

  // Ensure uniqueness if the user pattern omitted both {number} and {order_display_id}
  if (
    !/\{number\}/i.test(pattern) &&
    !/\{order_display_id\}/i.test(pattern)
  ) {
    formatted = `${formatted}-${paddedNumber}`
  }

  return formatted
}
