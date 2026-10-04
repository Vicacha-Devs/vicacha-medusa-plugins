import {
  BoldButtonPayload,
  BoldButtonResponse,
  BoldLinkPayload,
  BoldLinkResponse,
  BoldQrPayload,
  BoldQrResponse,
  BoldRefundPayload,
  BoldRefundResponse,
  BoldStatusStreamCallbacks,
  BoldTerminalItem,
  BoldTerminalPayload,
  BoldTerminalResponse
} from "../types"
import { BOLD_FAILED_STATUSES, BOLD_SUCCESS_STATUSES } from "../types/constants"

export class BoldApiClient {
  private baseUrl: string
  private prefix: string

  constructor(prefix: "/admin" | "/store" = "/store", baseUrl: string = "") {
    this.prefix = prefix
    this.baseUrl = baseUrl
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${this.prefix}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`)
    }

    return data as T
  }

  async createPaymentLink(payload: BoldLinkPayload) {
    return this.fetch<BoldLinkResponse>("/bold/payment-link", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async createPaymentButton(payload: BoldButtonPayload) {
    return this.fetch<BoldButtonResponse>("/bold/payment-button", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async createPaymentQr(payload: BoldQrPayload) {
    return this.fetch<BoldQrResponse>("/bold/payment-qr", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async pushToTerminal(payload: BoldTerminalPayload) {
    return this.fetch<BoldTerminalResponse>("/bold/pos-push", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  subscribeToPaymentStatus(
    sessionId: string,
    callbacks: BoldStatusStreamCallbacks
  ): () => void {
    const url = `${this.baseUrl}${this.prefix}/bold/payment-stream?paymentSessionId=${encodeURIComponent(sessionId)}`
    const eventSource = new EventSource(url)

    callbacks.onStatusChange?.("pending", null)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        const status = (data.status || "").toLowerCase()

        const isSuccess = BOLD_SUCCESS_STATUSES.includes(status)
        const isFailure = BOLD_FAILED_STATUSES.includes(status)

        if (isSuccess) {
          callbacks.onStatusChange?.("captured", data)
          callbacks.onSuccess?.(data)
          eventSource.close()
        } else if (isFailure) {
          callbacks.onStatusChange?.("error", data)
          callbacks.onError?.(data)
          eventSource.close()
        } else {
          callbacks.onStatusChange?.("pending", data)
        }
      } catch (err) {
        callbacks.onError?.(err)
      }
    }

    eventSource.onerror = (err) => {
      callbacks.onStatusChange?.("error", err)
      callbacks.onError?.(err)
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }

  /**
   * Retrieves active registered POS data-phone / terminals associated with the Bold merchant account.
   */
  async getTerminals(): Promise<Array<BoldTerminalItem>> {
    return this.fetch<Array<BoldTerminalItem>>("/bold/terminals", {
      method: "GET",
    })
  }

  async refundPayment(payload: BoldRefundPayload): Promise<BoldRefundResponse> {
    return this.fetch<BoldRefundResponse>("/bold/refund", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }
}

// Export pre-configured SDK instances
export const boldAdminSdk = new BoldApiClient("/admin")
export const boldStoreSdk = new BoldApiClient("/store")
