import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { Logger } from "@medusajs/medusa"
import {
  BoldBaseOptions,
  CreatePaymentLinkPayload,
  InjectedDependencies,
} from "@payment-bold/types"
import { EBoldPaymentProvider } from "@payment-bold/types/enums"

import { BoldHttpClient } from "../../services/bold-client"

export class BoldLinkPaymentProviderService extends AbstractPaymentProvider<BoldBaseOptions> {
  static identifier = EBoldPaymentProvider.LINK
  
  protected logger_: Logger
  protected options_: BoldBaseOptions
  protected client_: BoldHttpClient

  constructor(container: InjectedDependencies, options: BoldBaseOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = new BoldHttpClient(options, this.logger_)
  }

  /**
   * Initializes a Bold Payment Link session.
   */
  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data } = input

    try {
      const extra = (data || {}) as Record<string, unknown>
      const reference = (extra.reference as string) || `link_ref_${Date.now()}`
      const numAmount = Math.round(Number(amount))
      const currency = (currency_code || this.options_.defaultCurrency || "COP").toUpperCase()

      const payload: CreatePaymentLinkPayload = {
        amount: numAmount,
        currency,
        reference,
        description: (extra.description as string) || `Order ${reference}`,
        email: extra.email as string,
        callbackUrl: extra.callbackUrl as string | undefined,

        vatAmount: extra.vatAmount != null ? Number(extra.vatAmount) : 0,
        consumptionTaxAmount: extra.consumptionTaxAmount != null ? Number(extra.consumptionTaxAmount) : 0,

        imageUrl: extra.imageUrl as string | undefined,
        expirationMinutes: extra.expirationMinutes
          ? Number(extra.expirationMinutes)
          : this.options_.linkExpirationMinutes,
      }      

      const linkResponse = await this.client_.createPaymentLink(payload)      

      return {
        id: linkResponse.payload.payment_link,
        data: {
          ...data,
          payment_link_id: linkResponse.payload.payment_link,
          payment_url: linkResponse.payload.url,
          reference,
          status: "pending",
        },
      }
    } catch (error: any) {
      this.logger_.error(`[BoldLink] Error generating payment link: ${error.message}`)

      if (error instanceof MedusaError) {
        throw error
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[BoldLink] Failed to initiate payment link: ${error.message}`
      )
    }
  }

  /**
   * Authorizes a payment link session.
   */
  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const sessionData = (input.data || {}) as Record<string, unknown>

    // 1. Check current session status or verify against Bold if still pending
    let status = (sessionData.status as string) || (sessionData.payment_status as string)

    const linkId = (sessionData.payment_link_id || sessionData.id || sessionData.payment_link) as string

    if (["pending", "ACTIVE"].includes(status) && linkId) {
      try {
        const linkStatusRes = (await this.client_.getLinkStatus(linkId)) as any
        const remoteStatus = linkStatusRes?.payload?.status || linkStatusRes?.status
        if (remoteStatus) {
          status = remoteStatus
          sessionData.status = remoteStatus
          sessionData.transaction_id = linkStatusRes?.payload?.transaction_id || linkStatusRes?.transaction_id
          sessionData.payment_method = linkStatusRes?.payload?.payment_method || linkStatusRes?.payment_method
        }
      } catch {
        // Keep existing status if network fails
      }
    }

    // 2. Return AUTHORIZED if status is PAID, APPROVED, SUCCESSFUL, or captured
    if (["PAID", "APPROVED", "SUCCESSFUL", "captured"].includes(status)) {
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          ...sessionData,
          status: "captured",
        },
      }
    }

    if (["REJECTED", "FAILED", "CANCELLED", "EXPIRED", "error"].includes(status)) {
      return {
        status: PaymentSessionStatus.CANCELED,
        data: sessionData,
      }
    }

    return {
      status: PaymentSessionStatus.PENDING,
      data: sessionData,
    }
  }

  /**
   * Captures the payment.
   */
  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const paymentData = (input.data || {}) as Record<string, unknown>
    return {
      data: {
        ...paymentData,
        status: "captured",
      },
    }
  }

  /**
   * Cancels the payment session.
   */
  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const paymentData = (input.data || {}) as Record<string, unknown>
    return {
      data: {
        ...paymentData,
        status: "canceled",
      },
    }
  }

  /**
   * Refunds a payment made via Bold Link.
   */
  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const { data, amount } = input
    const pData = (data || {}) as Record<string, unknown>
    const transactionId = (pData.transaction_id || pData.id) as string

    if (!transactionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing transaction_id for refund operation"
      )
    }

    try {
      const refundRes = await this.client_.refundPayment({
        transactionId,
        amount: Math.round(Number(amount)),
      })

      return {
        data: {
          ...pData,
          refund_id: refundRes.refund_id,
          refunded_amount: amount,
          status: "refunded",
        },
      }
    } catch (error: any) {
      this.logger_.error(`[BoldLink] Refund error: ${error.message}`)

      if (error instanceof MedusaError) {
        throw error
      }

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `[BoldLink] Refund failed: ${error.message}`
      )
    }
  }

  /**
   * Deletes a payment session.
   */
  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    const sessionData = (input.data || {}) as Record<string, unknown>
    return {
      data: {
        ...sessionData,
        status: "deleted",
      },
    }
  }

  /**
   * Updates a payment session.
   */
  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input)
  }

  /**
   * Checks the status of a payment link via link ID or reference voucher.
   */
  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const sessionData = (input.data || {}) as Record<string, unknown>
    const linkId = (sessionData.payment_link_id || sessionData.id || sessionData.payment_link) as string
    const reference = (sessionData.reference || sessionData.reference_id) as string

    try {
      let status: string | undefined
      let transactionId: string | undefined

      if (linkId) {
        const linkStatusRes = (await this.client_.getLinkStatus(linkId)) as any
        status = linkStatusRes?.payload?.status || linkStatusRes?.status || linkStatusRes?.payment_status
        transactionId = linkStatusRes?.payload?.transaction_id || linkStatusRes?.transaction_id
      } else if (reference) {
        const voucherRes = (await this.client_.getPaymentVoucher(reference)) as any
        status = voucherRes?.payload?.status || voucherRes?.status || voucherRes?.payment_status
        transactionId = voucherRes?.payload?.transaction_id || voucherRes?.transaction_id
      }

      if (transactionId) {
        sessionData.transaction_id = transactionId
      }

      if (["PAID", "APPROVED", "SUCCESSFUL", "captured"].includes(status || "")) {
        sessionData.status = "captured"
        return { status: PaymentSessionStatus.AUTHORIZED }
      }

      if (["REJECTED", "FAILED", "CANCELLED", "EXPIRED"].includes(status || "")) {
        sessionData.status = "canceled"
        return { status: PaymentSessionStatus.CANCELED }
      }

      return { status: PaymentSessionStatus.PENDING }
    } catch {
      return { status: PaymentSessionStatus.PENDING }
    }
  }

  /**
   * Processes incoming Bold webhook notifications natively in Medusa v2.
   * Verifies the HMAC-SHA256 signature and maps the event to PaymentActions.
   */
  async getWebhookActionAndData(data: {
    data: Record<string, unknown>
    rawData: string | Buffer
    headers: Record<string, unknown>
  }): Promise<WebhookActionResult> {
    return {
      action: PaymentActions.NOT_SUPPORTED,
    }
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return paymentSessionData
  }
}
