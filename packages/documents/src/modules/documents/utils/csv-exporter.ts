import type { AccountingCsvRow } from "../../../types"

export type { AccountingCsvRow } from "../../../types"

const CSV_FORMULA_TRIGGERS = /^[=+\-@\t\r]/

/**
 * Escapes a CSV cell value and neutralizes spreadsheet formula injection (CWE-1236)
 * by prefixing dangerous leading characters (`=`, `+`, `-`, `@`) with a single quote
 * unless the value is a pure negative number (e.g. `-49.99` for credit notes).
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0"
  }
  if (value instanceof Date) {
    return value.toISOString()
  }

  let str = String(value)
  // Allow negative numeric strings like "-12.50", but neutralize formula strings like "=-SUM(A1:A2)"
  const isNegativeNumber = /^-\d+(\.\d+)?$/.test(str.trim())
  if (!isNegativeNumber && CSV_FORMULA_TRIGGERS.test(str)) {
    str = `'${str}`
  }

  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function generateAccountingCsv(rows: AccountingCsvRow[]): string {
  const headers = [
    "document_number",
    "document_type",
    "status",
    "version",
    "order_id",
    "order_display_id",
    "customer_name",
    "customer_email",
    "company_name",
    "buyer_tax_id",
    "currency_code",
    "subtotal",
    "discount_total",
    "shipping_total",
    "tax_total",
    "total",
    "locale",
    "region_id",
    "related_document_id",
    "generated_at",
    "emailed_at",
  ]

  const lines: string[] = [headers.join(",")]

  for (const row of rows) {
    const values = [
      row.document_number,
      row.document_type,
      row.status,
      row.version,
      row.order_id,
      row.order_display_id ?? "",
      row.customer_name ?? "",
      row.customer_email ?? "",
      row.company_name ?? "",
      row.buyer_tax_id ?? "",
      row.currency_code?.toUpperCase() ?? "",
      row.subtotal ?? "",
      row.discount_total ?? "",
      row.shipping_total ?? "",
      row.tax_total ?? "",
      row.total ?? "",
      row.locale ?? "en",
      row.region_id ?? "global",
      row.related_document_id ?? "",
      row.generated_at
        ? row.generated_at instanceof Date
          ? row.generated_at.toISOString()
          : String(row.generated_at)
        : "",
      row.emailed_at
        ? row.emailed_at instanceof Date
          ? row.emailed_at.toISOString()
          : String(row.emailed_at)
        : "",
    ].map(escapeCsvCell)

    lines.push(values.join(","))
  }

  return lines.join("\r\n") + "\r\n"
}
