import { MappedPaymentError } from "."

export const BOLD_ERROR_MAP: Record<string, MappedPaymentError> = {
  EXPIRED_CARD: {
    code: "EXPIRED_CARD",
    userMessage: "bold.errors.expired_card",
    adminReason: "Card expiration date is in the past.",
    retryable: false,
  },
  INVALID_CARD_NUMBER: {
    code: "INVALID_CARD_NUMBER",
    userMessage: "bold.errors.invalid_card_number",
    adminReason: "Luhn check or card bin validation failed.",
    retryable: true,
  },
  INVALID_CVV: {
    code: "INVALID_CVV",
    userMessage: "bold.errors.invalid_cvv",
    adminReason: "CVV verification failed at issuer.",
    retryable: true,
  },
  INSUFFICIENT_FUNDS: {
    code: "INSUFFICIENT_FUNDS",
    userMessage: "bold.errors.insufficient_funds",
    adminReason: "Declined by issuing bank due to insufficient funds.",
    retryable: false,
  },
  EXCEEDS_TRANSACTION_LIMIT: {
    code: "EXCEEDS_TRANSACTION_LIMIT",
    userMessage: "bold.errors.exceeds_transaction_limit",
    adminReason: "Transaction amount exceeds card limit.",
    retryable: false,
  },
  "3DS_AUTHENTICATION_FAILED": {
    code: "3DS_AUTHENTICATION_FAILED",
    userMessage: "bold.errors.3ds_authentication_failed",
    adminReason: "Issuer 3DS OTP validation failed or timed out.",
    retryable: true,
  },
  FRAUD_SUSPECTED: {
    code: "FRAUD_SUSPECTED",
    userMessage: "bold.errors.fraud_suspected",
    adminReason: "Bold or issuing bank anti-fraud filter flagged transaction.",
    retryable: false,
  },
  RESTRICTED_CARD: {
    code: "RESTRICTED_CARD",
    userMessage: "bold.errors.restricted_card",
    adminReason: "Card is reported stolen, lost, or blocked for e-commerce.",
    retryable: false,
  },
  NEQUI_TIMEOUT: {
    code: "NEQUI_TIMEOUT",
    userMessage: "bold.errors.nequi_timeout",
    adminReason: "Push notification was not approved within the timeout window.",
    retryable: true,
  },
  PSE_BANK_UNAVAILABLE: {
    code: "PSE_BANK_UNAVAILABLE",
    userMessage: "bold.errors.pse_bank_unavailable",
    adminReason: "Financial institution bank node down or unreachable.",
    retryable: true,
  },
  DEFAULT_ERROR: {
    code: "GENERIC_DECLINE",
    userMessage: "bold.errors.generic_decline",
    adminReason: "Generic or unspecified gateway error.",
    retryable: true,
  },
}

export function parseBoldError(boldErrorData: any): MappedPaymentError {
  const rawCode =
    boldErrorData?.code ||
    boldErrorData?.failure_code ||
    boldErrorData?.errors?.[0]?.code ||
    ""

  const uppercaseCode = rawCode.toUpperCase().replace(/\s+/g, "_")

  return BOLD_ERROR_MAP[uppercaseCode] || {
    ...BOLD_ERROR_MAP.DEFAULT_ERROR,
    adminReason: `Unmapped error: ${JSON.stringify(boldErrorData)}`,
  }
}