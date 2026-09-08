export const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    signDisplay: "auto",
  }).format(amount)
}

export const safeFormatCurrency = (amount: number | null | undefined, currencyCode: string | null | undefined) => {
  if (amount == null || !currencyCode) return "-"
  return formatCurrency(amount, currencyCode)
}
