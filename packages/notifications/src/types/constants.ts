export const NOTIFICATIONS_MODULE = "notificationsModuleService"

export const NOTIFICATION_CHANNELS = [
  "email",
  "whatsapp",
  "telegram",
  "sms",
  "slack",
  "dummy",
] as const

export const CHANNELS = NOTIFICATION_CHANNELS

export const TEMPLATE_MODES = ["blocks", "raw"] as const

export const TEMPLATE_SOURCES = ["system", "db", "external"] as const

export const BLOCK_TYPES = [
  "section",
  "heading",
  "text",
  "row",
  "separator",
  "group",
  "repeater",
  "product-item",
  "button",
  "actions",
  "divider",
  "attachment",
] as const

export const WHATSAPP_DRIVERS = [
  "meta-cloud",
  "openwa",
  "waha",
  "evolution",
] as const

export const SMS_DRIVERS = [
  "twilio",
  "signalhouse",
  "msg91",
  "smsapi",
  "webhook",
  "dummy",
] as const

export const RECIPIENT_RULES = [
  "customer_auto",
  "order_email",
  "customer_email",
  "order_phone",
  "customer_phone",
  "customer_telegram",
  "merchant_channel",
  "b2b_accounting_contact",
  "custom_recipient",
] as const

export const DELIVERY_STATUSES = [
  "pending",
  "sent",
  "delivered",
  "failed",
  "skipped_idempotent",
  "skipped_no_consent",
  "rate_limited_delayed",
] as const

export const CONSENT_STATUSES = ["opted_in", "opted_out", "pending"] as const

export const BROADCAST_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "completed",
  "canceled",
] as const

export const SUPPORTED_LOCALES = [
  "en",
  "es",
  "pl",
  "de",
  "fr",
  "pt",
  "it",
  "nl",
  "tr",
  "ar",
] as const

export const SUPPORTED_EVENTS = [
  "order.placed",
  "order.completed",
  "order.canceled",
  "order.updated",
  "order.fulfillment_created",
  "order.fulfillment_canceled",
  "order.return_requested",
  "order.return_received",
  "order.refund_created",
  "shipment.created",
  "delivery.created",
  "customer.created",
  "customer.updated",
  "inventory-level.updated",
  "document.generated",
  "auth.otp_generated",
  "cart.abandoned",
  "loyalty.points_credited",
  "loyalty.points_debited",
  "wallet.credited",
  "wallet.debited",
  "membership.tier_changed",
  "contact.form_submitted",
] as const

export const CONTEXT_TYPES = [
  "order",
  "shipment",
  "product",
  "inventory-level",
  "customer",
  "cart",
  "document",
  "otp",
  "custom",
] as const

export const SUPPORTED_UI_LOCALES = [
  { code: "en", label: "English (EN)" },
  { code: "es", label: "Español (ES)" },
  { code: "de", label: "Deutsch (DE)" },
  { code: "fr", label: "Français (FR)" },
  { code: "pt", label: "Português (PT)" },
  { code: "it", label: "Italiano (IT)" },
  { code: "nl", label: "Nederlands (NL)" },
  { code: "pl", label: "Polski (PL)" },
  { code: "tr", label: "Türkçe (TR)" },
  { code: "ar", label: "العربية (AR)" },
] as const
