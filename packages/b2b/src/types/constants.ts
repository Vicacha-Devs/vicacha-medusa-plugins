export const QUOTE_STATUS = [
    "pending_merchant",
    "pending_customer",
    "accepted",
    "customer_rejected",
    "merchant_rejected",
] as const

export const SPENDING_LIMIT_RESET_FREQUENCY = [
    "never",
    "daily",
    "weekly",
    "monthly",
    "yearly"
] as const
