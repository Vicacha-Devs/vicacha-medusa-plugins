export const BOLD_ENVIRONMENT = ["sandbox" , "production"] as const

export const BOLD_PAYMENT_ACTIONS_SUCCESSFUL = ["PAID", "APPROVED", "SUCCESSFUL"] as const

export const BOLD_PAYMENT_ACTIONS_FAILED = ["REJECTED", "FAILED", "EXPIRED", "CANCELLED"] as const

export const BOLD_PAYMENT_METHOD_TYPE = ["card" , "pse" , "nequi" , "bancolombia" , "qr"] as const

// TODO: if lowercased does not work, this is the right
// export const BOLD_PAYMENT_METHOD_TYPE = ["CARD" , "PSE" , "NEQUI" , "BANCOLOMBIA" , "QR"] as const

export const BOLD_PLUGIN_PROVIDERS = [
    "bold-online",
    "bold-link",
    "bold-button",
    "bold-terminal",
] as const

export const BOLD_FAILED_STATUSES = [
  "canceled",
  "cancelled",
  "error",
  "rejected",
  "failed",
] as const


export const BOLD_SUCCESS_STATUSES = ["captured", "authorized", "paid"] as const
