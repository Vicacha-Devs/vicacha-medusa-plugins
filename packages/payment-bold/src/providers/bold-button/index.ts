import {
  AbstractPaymentProvider,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"
import { Logger } from "@medusajs/medusa"
import { BoldBaseOptions, InjectedDependencies } from "@payment-bold/types"
import { BoldHttpClient } from "../../services/bold-client"
import { EBoldPaymentProvider } from "@payment-bold/types/enums"

export class BoldButtonPaymentProviderService extends AbstractPaymentProvider<BoldBaseOptions> {
  static identifier = EBoldPaymentProvider.BUTTON
  
  protected logger_: Logger
  protected options_: BoldBaseOptions
  protected client_: BoldHttpClient

  constructor(container: InjectedDependencies, options: BoldBaseOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.options_ = options
    this.client_ = new BoldHttpClient(options, this.logger_)
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const { amount, currency_code, data } = input
    const extra = (data || {}) as Record<string, unknown>
    const reference = (extra.reference as string) || `btn_ref_${Date.now()}`

    return {
      id: reference,
      data: {
        ...data,
        reference,
        status: "pending",
        amount: Math.round(Number(amount)),
        currency: (currency_code || this.options_.defaultCurrency || "COP").toUpperCase(),
      },
    }
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const sessionData = (input.data || {}) as Record<string, unknown>
    let status = (sessionData.status as string) || (sessionData.payment_status as string)
    const reference = (sessionData.reference || sessionData.reference_id) as string

    if (["pending", "ACTIVE"].includes(status) && reference) {
      try {
        const voucherRes = (await this.client_.getPaymentVoucher(reference)) as any
        const remoteStatus = voucherRes?.payload?.status || voucherRes?.status || voucherRes?.payment_status
        if (remoteStatus) {
          status = remoteStatus
          sessionData.status = remoteStatus
          sessionData.transaction_id = voucherRes?.payload?.transaction_id || voucherRes?.transaction_id
          sessionData.payment_method = voucherRes?.payload?.payment_method || voucherRes?.payment_method
        }
      } catch {
        // Retain local status on network timeout
      }
    }

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

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const paymentData = (input.data || {}) as Record<string, unknown>
    return { data: { ...paymentData, status: "captured" } }
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    const paymentData = (input.data || {}) as Record<string, unknown>
    return { data: { ...paymentData, status: "canceled" } }
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const { data, amount } = input
    const pData = (data || {}) as Record<string, unknown>
    const transactionId = (pData.transaction_id || pData.id) as string

    if (!transactionId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing transaction_id for refund operation"
      )
    }

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
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: { ...input.data, status: "deleted" } }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return this.initiatePayment(input)
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const sessionData = (input.data || {}) as Record<string, unknown>
    const reference = (sessionData.reference || sessionData.reference_id) as string

    try {
      if (reference) {
        const voucherRes = (await this.client_.getPaymentVoucher(reference)) as any
        const status = voucherRes?.payload?.status || voucherRes?.status || voucherRes?.payment_status
        const transactionId = voucherRes?.payload?.transaction_id || voucherRes?.transaction_id

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
      }

      return { status: PaymentSessionStatus.PENDING }
    } catch {
      return { status: PaymentSessionStatus.PENDING }
    }
  }

  async getWebhookActionAndData(data: {
    data: Record<string, unknown>
    rawData: string | Buffer
    headers: Record<string, unknown>
  }): Promise<WebhookActionResult> {
    return { action: PaymentActions.NOT_SUPPORTED }
  }

  async retrievePayment(paymentSessionData: Record<string, unknown>): Promise<Record<string, unknown>> {
    return paymentSessionData
  }
}
