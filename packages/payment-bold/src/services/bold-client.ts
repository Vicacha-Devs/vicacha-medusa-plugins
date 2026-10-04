import { MedusaError } from "@medusajs/framework/utils"
import { Logger } from "@medusajs/medusa"
import {
  BankItem,
  BoldBaseOptions,
  BoldCreatePaymentLinkResponse,
  BoldLinkPaymentStatusResponse,
  BoldPaymentAttemptResponse,
  BoldPaymentIntentPayload,
  BoldPaymentMethod,
  BoldPaymentMethodsResponse,
  BoldRefundApiRequest,
  BoldRefundApiResponse,
  BoldTerminalItem,
  BoldTerminalPayload,
  BoldTerminalsResponse,
  CreatePaymentLinkPayload,
  CreateRefundPayload,
} from "@payment-bold/types"

const HTTP_ERROR_MAP: Record<number, string> = {
  400: MedusaError.Types.INVALID_DATA,
  401: MedusaError.Types.UNAUTHORIZED,
  403: MedusaError.Types.UNAUTHORIZED,
  404: MedusaError.Types.NOT_FOUND,
  409: MedusaError.Types.DUPLICATE_ERROR,
  422: MedusaError.Types.INVALID_DATA,
}

export class BoldHttpClient {
  private readonly integrationsUrl = "https://integrations.api.bold.co"
  private readonly onlineUrl = "https://api.online.payments.bold.co"
  private readonly paymentsUrl = "https://payments.api.bold.co/v2/payment-voucher/"

  private readonly buttonApiKey: string
  private readonly integrationApiKey: string
  private readonly logger: Logger
  private readonly linkExpirationMinutes: number
  private readonly defaultCurrency: string

  constructor(options: BoldBaseOptions, logger: Logger) {
    // Resolve integration key (with general apiKey fallback)
    this.integrationApiKey = options.integrationApiKey || ""

    // Resolve button key (with general apiKey fallback)
    this.buttonApiKey = options.buttonApiKey || ""

    this.defaultCurrency = (options.defaultCurrency || "cop").toUpperCase()
    this.linkExpirationMinutes = options.linkExpirationMinutes || 10
    this.logger = logger
  }

  /**
   * Universal HTTP Request method with explicit API key resolution.
   */
  private async request<T>(
    baseUrl: string,
    endpoint: string,
    apiKey: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `x-api-key ${apiKey}`,
      ...options.headers,
    }

    this.logger?.debug(`[BoldHttpClient] Requesting ${options.method || "GET"} ${url}`)

    try {
      const response = await fetch(url, { ...options, headers })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        this.logger?.error(`[BoldHttpClient] API Error on ${endpoint}`, data)

        const errorType = HTTP_ERROR_MAP[response.status] || MedusaError.Types.UNEXPECTED_STATE

        throw new MedusaError(
          errorType,
          data?.message || `Bold API request failed with status ${response.status}`
        )
      }

      return data as T
    } catch (error: any) {
      if (error instanceof MedusaError) {
        throw error
      }

      this.logger?.error(`[BoldHttpClient] Network error on ${endpoint}: ${error.message}`)

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Bold API network request failed: ${error.message}`
      )
    }
  }

  /**
   * Helper to construct the target Bold payment_method payload based on input type.
   */
  private buildPaymentMethodPayload(payload: BoldPaymentIntentPayload): BoldPaymentMethod {
    switch (payload.methodType) {
      case "card":
        return {
          name: "CREDIT_CARD",
          card_number: payload.cardNumber || "",
          cardholder_name: payload.cardholderName || "",
          expiration_month: payload.expirationMonth || "",
          expiration_year: payload.expirationYear || "",
          installments: payload.installments || 1,
          cvc: payload.cvc || "",
        }

      case "pse":
        return {
          name: "PSE",
          bank_code: payload.bankCode || "",
          bank_name: payload.bankName || "",
        }

      case "nequi":
        return {
          name: "NEQUI",
        }

      case "bancolombia":
        return {
          name: "BOTON_BANCOLOMBIA",
        }

      case "qr":
      default:
        return {
          name: "QR",
          qr_format: payload.qrFormat || "TEXT",
        }
    }
  }

  /**
   * Generates an online payment link with tax breakdown.
   * Key: integrationApiKey
   * Target: integrationsUrl (/online/link/v1)
   */
  async createPaymentLink(payload: CreatePaymentLinkPayload) {
    const nowMs = BigInt(Date.now())
    const minutesInNs = BigInt(this.linkExpirationMinutes) * 60n * 1000n * 1000n * 1000n
    const expirationNs = (nowMs * 1000000n) + minutesInNs

    const currency = (payload.currency || this.defaultCurrency).toUpperCase()
    const totalAmount = this.formatAmount(payload.amount)
    const vatAmount = payload.vatAmount ? this.formatAmount(payload.vatAmount) : 0

    const body = {
      amount_type: "CLOSE",
      amount: {
        currency,
        total_amount: totalAmount,
        taxes: vatAmount > 0
          ? [{ type: "VAT", base: totalAmount - vatAmount, value: vatAmount }]
          : [],
        tip_amount: 0,
      },
      reference: payload.reference,
      description: payload.description || `Medusa Order ${payload.reference}`,
      expiration_date: Number(expirationNs),
      callback_url: payload.callbackUrl,
      payer_email: payload.email,
      image_url: payload.imageUrl
    }

    return this.request<BoldCreatePaymentLinkResponse>(
      this.integrationsUrl,
      "/online/link/v1",
      this.integrationApiKey,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * Queries payment status and transaction details by Bold link ID.
   * Key: integrationApiKey
   * Target: integrationsUrl (/online/link/v1/{linkId})
   */
  async getLinkStatus(linkId: string) {
    return this.request<BoldLinkPaymentStatusResponse>(
      this.integrationsUrl,
      `/online/link/v1/${encodeURIComponent(linkId)}`,
      this.integrationApiKey,
      {
        method: "GET",
      }
    )
  }

  /**
   * Queries available POS payment terminals associated with the account.
   * Key: integrationApiKey
   * Target: integrationsUrl (/payments/terminals)
   */
  async getTerminals(): Promise<Array<BoldTerminalItem>> {
    const response = await this.request<BoldTerminalsResponse>(
      this.integrationsUrl,
      "/payments/binded-terminals",
      this.integrationApiKey,
      {
        method: "GET",
      }
    )

    return response?.payload.available_terminals || []
  }

  /**
   * Triggers terminal checkout dispatch to a physical data-phone POS.
   * Key: integrationApiKey
   * Target: integrationsUrl (/payments/app-checkout)
   */
  async triggerTerminalCheckout(payload: BoldTerminalPayload) {
    const vatAmount = payload.vatAmount ? this.formatAmount(payload.vatAmount) : 0

    const payer = payload.payer ? {
      email: payload.payer.email,
      phone_number: payload.payer.phoneNumber,
      document: {
        document_type: payload.payer.document.documentType,
        document_number: payload.payer.document.documentNumber
      }
    } : null

    const body = {
      amount: {
        currency: (payload.currency || this.defaultCurrency).toUpperCase(),
        total: this.formatAmount(payload.amount),
        taxes: vatAmount > 0
          ? [{ type: "VAT", value: vatAmount }]
          : [],
        tip: 0,
      },
      payment_method: "POS",
      terminal_model: payload.terminalModel,
      terminal_serial: payload.terminalSerial,
      reference: payload.reference,
      user_email: payload.userEmail,
      description: payload.description || "Medusa POS Order",
      payer
    }

    return this.request<{ payload: { id: string } }>(
      this.integrationsUrl,
      "/payments/app-checkout",
      this.integrationApiKey,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * Queries available payment methods enabled for the merchant.
   * Key: integrationApiKey
   * Target: integrationsUrl (/online/payment-methods/v1)
   */
  async getAvailablePaymentMethods(): Promise<Array<BoldPaymentMethod>> {
    const response = await this.request<BoldPaymentMethodsResponse>(
      this.integrationsUrl,
      "/online/payment-methods/v1",
      this.integrationApiKey,
      {
        method: "GET",
      }
    )

    return response?.payload.payment_methods || []
  }

  /**
   * Creates an online payment intent.
   * Key: buttonApiKey
   * Target: onlineUrl (/v1/payment-intent)
   */
  async createPaymentIntent(payload: BoldPaymentIntentPayload): Promise<BoldPaymentAttemptResponse> {
    const body = {
      reference_id: payload.reference,
      ...(payload.metadata && { metadata: payload.metadata }),
      payer: {
        person_type: payload.payer?.personType || "NATURAL_PERSON",
        name: payload.payer?.name,
        phone: payload.payer?.phone,
        email: payload.payer?.email,
        document_type: payload.payer?.documentType || "CEDULA",
        document_number: payload.payer?.documentNumber,
        ...(payload.payer?.billingAddress && {
          billing_address: payload.payer.billingAddress,
        }),
      },
      payment_method: this.buildPaymentMethodPayload(payload),
      ...(payload.deviceFingerprint && {
        device_fingerprint: payload.deviceFingerprint,
      }),
    }

    return this.request<BoldPaymentAttemptResponse>(
      this.onlineUrl,
      "/v1/payment-intent",
      this.buttonApiKey,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * Requests a full or partial refund for a transaction via Bold API Online.
   * Key: buttonApiKey
   * Target: onlineUrl (/v1/refunds)
   */
  async refundPayment(payload: CreateRefundPayload): Promise<BoldRefundApiResponse> {
    const body: BoldRefundApiRequest = {
      transaction_id: payload.transactionId,
      amount: this.formatAmount(payload.amount),
      ...(payload.reason && { reason: payload.reason }),
    }

    return this.request<BoldRefundApiResponse>(
      this.onlineUrl,
      "/v1/refunds",
      this.buttonApiKey,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    )
  }

  /**
   * Queries payment status and voucher details by order reference ID.
   * Key: buttonApiKey
   * Target: paymentsUrl (reference)
   */
  async getPaymentVoucher(reference: string) {
    return this.request<BoldLinkPaymentStatusResponse>(
      this.paymentsUrl,
      encodeURIComponent(reference),
      this.buttonApiKey,
      {
        method: "GET",
      }
    )
  }

  /**
   * Fetches the list of active PSE financial institutions/banks.
   * Key: buttonApiKey
   * Target: onlineUrl (/v1/payment/pse/banks)
   */
  async getPseBanks() {
    return this.request<Array<BankItem>>(
      this.onlineUrl,
      "/v1/payment/pse/banks",
      this.buttonApiKey,
      {
        method: "GET",
      }
    )
  }

  private formatAmount(amount: number): number {
    return Math.max(0, Math.round(amount))
  }
}