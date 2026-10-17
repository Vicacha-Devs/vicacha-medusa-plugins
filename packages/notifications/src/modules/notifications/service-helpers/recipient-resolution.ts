import type { B2BNotificationContacts } from "../integrations/documents-and-b2b-resolver"
import type { NotificationChannel, RecipientRule } from "../types"
import { normalizeE164Phone } from "../utils/security"

/**
 * Resolves the recipient address/phone/chat_id for a given `RecipientRule` and `NotificationChannel`.
 */
export function resolveRecipientForRule(params: {
  rule: RecipientRule | string
  custom_recipient?: string | null
  channel: NotificationChannel
  data: Record<string, any>
  b2b_contacts?: B2BNotificationContacts
  channel_config?: Record<string, any> | null
}): string | null {
  const { rule, custom_recipient, channel, data, b2b_contacts, channel_config } =
    params

  if (rule === "custom_recipient" && custom_recipient) {
    return custom_recipient.trim()
  }

  if (rule === "merchant_channel") {
    const cfgJson = channel_config?.config_json || {}
    return (
      custom_recipient?.trim() ||
      cfgJson.merchant_channel_id ||
      cfgJson.default_recipient ||
      process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
      process.env.SLACK_WEBHOOK_CHANNEL ||
      null
    )
  }

  if (rule === "b2b_accounting_contact") {
    if (channel === "email") {
      return (
        b2b_contacts?.accounting_email ||
        b2b_contacts?.buyer_contact_email ||
        data.email ||
        null
      )
    }
    if (channel === "sms" || channel === "whatsapp") {
      return normalizeE164Phone(b2b_contacts?.buyer_phone || data.phone)
    }
    if (channel === "telegram") {
      return b2b_contacts?.telegram_chat_id || data.customer?.telegram_chat_id || null
    }
  }

  if (rule === "order_email") {
    return data.email || data.customer?.email || null
  }
  if (rule === "customer_email") {
    return data.customer?.email || data.email || null
  }
  if (rule === "order_phone") {
    return normalizeE164Phone(
      data.phone ||
        data.shipping_address?.phone ||
        data.billing_address?.phone ||
        data.customer?.phone
    )
  }
  if (rule === "customer_phone") {
    return normalizeE164Phone(data.customer?.phone || data.phone)
  }
  if (rule === "customer_telegram") {
    return (
      data.customer?.telegram_chat_id ||
      data.telegram_chat_id ||
      b2b_contacts?.telegram_chat_id ||
      null
    )
  }

  // Default `customer_auto` resolution by channel
  switch (channel) {
    case "email":
      return data.email || data.customer?.email || null
    case "sms":
    case "whatsapp":
      return normalizeE164Phone(
        data.phone ||
          data.customer?.phone ||
          data.shipping_address?.phone ||
          data.billing_address?.phone
      )
    case "telegram":
      return (
        data.customer?.telegram_chat_id ||
        data.telegram_chat_id ||
        channel_config?.config_json?.merchant_channel_id ||
        process.env.TELEGRAM_MERCHANT_CHANNEL_ID ||
        null
      )
    case "slack":
      return (
        custom_recipient ||
        channel_config?.config_json?.webhook_url ||
        process.env.SLACK_WEBHOOK_URL ||
        "default-slack-channel"
      )
    case "dummy":
      return (
        normalizeE164Phone(data.phone || data.customer?.phone) ||
        data.email ||
        "sandbox-recipient"
      )
    default:
      return null
  }
}
