import { Logger } from "@medusajs/medusa"
import { BOLD_ENVIRONMENT, BOLD_PAYMENT_METHOD_TYPE } from "./constants"
import { BoldApiClient } from "@payment-bold/sdk/client"

// export { BOLD_PLUGIN_PROVIDERS } from "./constants"
export { EBoldPaymentProvider } from "./enums"

// ==========================================
// 1. Core Plugin Configuration & Utils
// ==========================================

export type TBoldEnvironment = typeof BOLD_ENVIRONMENT[number]

export interface BoldBaseOptions {
  // Payment Button Keys (used for Payment Links & Checkout Webhooks)
  buttonApiKey: string
  buttonSecretKey?: string

  // API Integrations Keys (used for Terminals / Data-phone)
  integrationApiKey?: string
  integrationSecretKey?: string

  defaultCurrency?: string
  linkExpirationMinutes?: number
}

export type InjectedDependencies = {
  logger: Logger
}

export interface MappedPaymentError {
  code: string
  userMessage: string
  adminReason: string
  retryable: boolean
}

// ==========================================
// 2. Bold API Schemas (snake_case)
// ==========================================

export interface BoldApiError {
  code?: string
  message?: string
  field?: string
}

export type BoldPersonType = "NATURAL_PERSON" | "LEGAL_PERSON"

export type BoldDocumentType =
  | "CEDULA"
  | "CEDULA_EXTRANJERIA"
  | "PASAPORTE"
  | "NIT"
  | "TI"
  | "PEP"

export interface BankItem {
  bank_code: string
  bank_name: string
}

export interface BoldBillingAddress {
  street1: string
  street2?: string
  city: string
  zip_code?: string
  province?: string
  country: string
  phone?: string
}

export interface BoldPayer {
  person_type?: BoldPersonType
  name?: string
  phone?: string
  email?: string
  document_type?: BoldDocumentType
  document_number?: string
  billing_address?: BoldBillingAddress
}

export interface BoldDeviceFingerprint {
  ip?: string
  device_type?: "DESKTOP" | "MOBILE" | "TABLET"
  os?: string
  model?: string
  browser?: string
  java_enabled?: boolean
  language?: string
  color_depth?: number
  screen_height?: number
  screen_width?: number
  time_zone_offset?: number
}

export interface BoldMetadata {
  key: string
  value: string
}

export interface BoldPaymentMethodQR {
  name: "QR"
  qr_format?: "BOLD_BASE64" | string
}

export interface BoldPaymentMethodCard {
  name: "CREDIT_CARD"
  card_number: string
  cardholder_name: string
  expiration_month: string
  expiration_year: string
  installments?: number
  cvc: string
}

export interface BoldPaymentMethodPSE extends BankItem {
  name: "PSE"
}

export interface BoldPaymentMethodBotonBancolombia {
  name: "BOTON_BANCOLOMBIA" | "NEQUI"
}

export type BoldPaymentMethod =
  | BoldPaymentMethodQR
  | BoldPaymentMethodCard
  | BoldPaymentMethodPSE
  | BoldPaymentMethodBotonBancolombia

// Raw payload sent to Bold POST /v1/payment-intent
export interface BoldPaymentIntentApiRequest {
  reference_id: string
  metadata?: BoldMetadata
  payer?: BoldPayer
  payment_method: BoldPaymentMethod
  device_fingerprint?: BoldDeviceFingerprint
}

// Raw response from Bold POST /v1/payment-intent
export interface BoldPaymentAttemptResponse {
  id: string
  status: string
  payment_url?: string
  reference_id: string
  payment_method?: {
    name: string
    [key: string]: any
  }
}

// Raw payload sent to Bold POST /v1/refunds
export interface BoldRefundApiRequest {
  transaction_id: string
  amount: number
  reason?: string
}

// Raw response from Bold POST /v1/refunds
export interface BoldRefundApiResponse {
  refund_id: string
  transaction_id: string
  amount: number
  status: string
  created_at: string
}

export type BoldLinkPaymentStatus =
  | "NO_TRANSACTION_FOUND"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "FAILED"
  | "CANCELLED"

export interface BoldLinkPaymentStatusResponse {
  link_id: string
  reference_id: string
  total: number
  subtotal: number
  description: string
  payment_status: BoldLinkPaymentStatus
  transaction_id?: string
  payment_method?: string
  payer_email?: string
  transaction_date?: string
}

export interface BoldWebhookPayload {
  event: "sale.successful" | "sale.failed" | "sale.rejected" | "refund.successful"
  data: {
    id: string
    reference: string
    amount: number
    currency: string
    status: string
    payment_method?: string
  }
}

// ==========================================
// 3. Plugin Internal Payloads (camelCase)
// ==========================================

export type PaymentMethodType = typeof BOLD_PAYMENT_METHOD_TYPE[number]

export interface BoldTerminalPayload {
  terminalModel: string
  terminalSerial: string
  amount: number
  currency: string
  reference: string
  vatAmount?: number
  userEmail: string
  description?: string
  payer?: {
    email: string
    phoneNumber: string
    document: {
      documentType: string
      documentNumber: string
    }
  }
}

export interface BoldPaymentIntentPayload {
  reference: string
  amount: number
  currency?: string
  methodType: PaymentMethodType
  description?: string
  callbackUrl?: string
  
  // Nested Payer details (Optional)
  payer?: {
    personType?: BoldPersonType
    name?: string
    phone?: string
    email?: string
    documentType?: BoldDocumentType
    documentNumber?: string
    billingAddress?: BoldBillingAddress
  }

  // Anti-fraud
  deviceFingerprint?: BoldDeviceFingerprint
  metadata?: BoldMetadata

  // Method-specific input fields
  cardNumber?: string
  cardholderName?: string
  expirationMonth?: string
  expirationYear?: string
  cvc?: string
  installments?: number
  bankCode?: string
  bankName?: string
  qrFormat?: string
}

export interface CreatePaymentLinkPayload {
  amount: number
  currency?: string
  reference: string
  description?: string
  expirationMinutes?: number
  email?: string
  callbackUrl?: string
  vatAmount?: number
  consumptionTaxAmount?: number
  imageUrl?: string
}

export interface CreateRefundPayload {
  transactionId: string
  amount: number
  reason?: string
}
export interface BoldPaymentLinkPayload {
  payment_link: string
  url: string
}

export interface BoldCreatePaymentLinkResponse {
  payload: BoldPaymentLinkPayload
  errors: Array<BoldApiError>
}

// ==========================================
// 4. Plugin Admin SDK
// ==========================================

export interface BoldLinkPayload {
  amount: number
  currency: string
  reference: string
  description: string
  email: string
  vatAmount?: number
  consumptionTaxAmount?: number
  callbackUrl?: string
  expirationMinutes?: number
  imageUrl?: string
  paymentCollectionId?: string
}

export interface BoldLinkResponse {
  paymentSession?: {
    id: string
    data?: {
      url?: string
      payment_url?: string
      status?: string
    }
  }
}

export interface BoldButtonPayload {
  amount: number
  currency: string
  reference: string
  description: string
  email?: string
  taxAmount?: number
  paymentCollectionId?: string
}

export interface BoldButtonResponse {
  paymentSession?: {
    id: string
    data?: {
      order_id?: string
      hash?: string
      checkout_url?: string
    }
  }
}

export interface BoldQrPayload {
  amount: number
  currency_code: string
  paymentCollectionId?: string
}

export interface BoldQrResponse {
  qr_payload: string
  session_id: string
}

export interface BoldTerminalPayload {
  amount: number
  currency_code: string
  terminal_id: string
  paymentCollectionId?: string
}

export interface BoldTerminalResponse {
  session_id: string
}

export type BoldPaymentStreamStatus = "pending" | "captured" | "error"

export interface BoldStatusStreamCallbacks {
  onStatusChange?: (status: BoldPaymentStreamStatus, rawData: any) => void
  onSuccess?: (rawData: any) => void
  onError?: (error?: any) => void
}

// ==========================================
// 5. Plugin Hooks
// ==========================================

export interface BoldMutationHookOptions {
  /**
   * The API client instance to use (e.g. boldAdminSdk or boldStoreSdk)
   * @default boldAdminSdk
   */
  client?: BoldApiClient // TODO: remove circular import
  /**
   * Custom query key array to invalidate upon mutation success
   * @default boldQueryKeys.orders()
   */
  queryKey?: readonly unknown[]
}

export interface ClientInfo {
  first_name?: string
  last_name?: string
  phone?: string
  email?: string
}

export interface BoldCheckoutDetails {
  boldMode: "link" | "button" | "qr" | "terminal"
  amount: number
  vatAmount?: number
  consumptionTaxAmount?: number
  callbackUrl?: string
  expirationMinutes?: number
  imageUrl?: string
  terminalId?: string
  paymentCollectionId?: string
}

export interface BoldCheckoutData {
  details: BoldCheckoutDetails
  paymentMode?: "installments" | "full"
  client: ClientInfo
  currencyCode: string
}

export type BoldCheckoutResult =
  | { type: "link"; url?: string; sessionId?: string }
  | { type: "button"; hash?: string; sessionId?: string }
  | { type: "qr"; qrPayload: string; sessionId: string }
  | { type: "terminal"; sessionId: string }
  