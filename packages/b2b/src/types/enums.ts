export enum EQuoteStatus {
  PendingMerchant = "pending_merchant",
  PendingCustomer = "pending_customer",
  Accepted = "accepted",
  CustomerRejected = "customer_rejected",
  MerchantRejected = "merchant_rejected",
}

export enum ESpendingLimitResetFrequency {
  NEVER = "never",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
}
