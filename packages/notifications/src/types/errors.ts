import type { MappedNotificationError } from "./index"

export const NOTIFICATIONS_ERROR_MAP: Record<string, MappedNotificationError> = {
  TEMPLATE_NOT_FOUND: {
    code: "template_not_found",
    message: "The requested notification template could not be found.",
    retryable: false,
  },
  CHANNEL_NOT_CONFIGURED: {
    code: "channel_not_configured",
    message: "The target notification channel or driver is not configured.",
    retryable: false,
  },
  CONSENT_REQUIRED: {
    code: "consent_required",
    message:
      "Recipient has not opted in to receive notifications on this channel.",
    retryable: false,
  },
  RATE_LIMIT_EXCEEDED: {
    code: "rate_limit_exceeded",
    message: "Channel provider rate limit exceeded. Delivery will be retried.",
    retryable: true,
  },
  PROVIDER_DELIVERY_FAILED: {
    code: "provider_delivery_failed",
    message: "The notification provider failed to deliver the message.",
    retryable: true,
  },
}
