import { formatCurrency } from "@medusajs/dashboard/lib"

export const safeFormatCurrency = (amount: number | null | undefined, currencyCode: string | null | undefined) => {
  if (amount == null || !currencyCode) return "-"
  return formatCurrency(amount, currencyCode)
}
