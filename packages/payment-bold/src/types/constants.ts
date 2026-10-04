export const BOLD_ENVIRONMENT = ["sandbox" , "production"] as const

export const BOLD_PAYMENT_PROVIDERS = [
  "pp_bold-link_bold",
  "pp_bold-online_bold",
  "pp_bold-button_bold",
  "pp_bold-terminal_bold",
]

export const BOLD_PAYMENT_ACTIONS_SUCCESSFUL = ["PAID", "APPROVED", "SUCCESSFUL", "captured"] as const

export const BOLD_PAYMENT_ACTIONS_FAILED = ["REJECTED", "FAILED", "CANCELLED", "EXPIRED", "error"] as const

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


export const BOLD_SUCCESS_STATUSES = ["captured", "authorized", "approved", "completed", "paid"] as const
