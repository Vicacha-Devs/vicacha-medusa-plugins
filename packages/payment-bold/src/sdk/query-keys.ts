export const BOLD_QUERY_KEY = "bold-payment-actions" as const

export const boldQueryKeys = {
  all: [BOLD_QUERY_KEY] as const,
  button:  () => [...boldQueryKeys.all, "payment-button"] as const,
  link: () => [...boldQueryKeys.all, "payment-link"] as const,
  orders: () => [...boldQueryKeys.all, "orders"] as const,
  order: (id: string) => [...boldQueryKeys.orders(), id] as const,
  paymentMethods: () => [...boldQueryKeys.all, "payment-methods"] as const,
  qr: () => [...boldQueryKeys.all, "payment-qr"] as const,
  refund: () => [...boldQueryKeys.all, "refund"] as const,
  terminals: () => ["bold", "terminals"] as const,
}
