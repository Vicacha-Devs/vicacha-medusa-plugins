import type { NotificationChannel } from "../types"
import {
  hashRecipient,
  maskRecipientPii,
  redactSensitivePayload,
} from "../utils/security"

export type DeliveryLogParams = {
  idempotency_key: string
  event_name: string
  entity_id?: string | null
  channel: NotificationChannel
  provider_id?: string | null
  driver?: string | null
  template_id?: string | null
  mapping_id?: string | null
  recipient: string
  status: string
  attempts?: number
  external_message_id?: string | null
  payload?: unknown
  error_code?: string | null
  error_message?: string | null
}

/**
 * Builds a delivery log row with masked PII and redacted payload.
 */
export function buildDeliveryLogRow(params: DeliveryLogParams) {
  return {
    idempotency_key: params.idempotency_key,
    event_name: params.event_name,
    entity_id: params.entity_id ?? null,
    channel: params.channel,
    provider_id: params.provider_id ?? null,
    driver: params.driver ?? null,
    template_id: params.template_id ?? null,
    mapping_id: params.mapping_id ?? null,
    recipient_masked: maskRecipientPii(params.recipient),
    recipient_hash: hashRecipient(params.recipient),
    status: params.status,
    attempts: params.attempts ?? 1,
    external_message_id: params.external_message_id ?? null,
    payload_redacted: redactSensitivePayload(params.payload) as Record<
      string,
      any
    >,
    error_code: params.error_code ?? null,
    error_message: params.error_message ?? null,
    sent_at:
      params.status === "sent" || params.status === "delivered"
        ? new Date()
        : null,
    delivered_at: params.status === "delivered" ? new Date() : null,
  }
}
