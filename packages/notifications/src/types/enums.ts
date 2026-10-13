export const ENotificationChannel = {
  EMAIL: "email",
  WHATSAPP: "whatsapp",
  TELEGRAM: "telegram",
  SMS: "sms",
  SLACK: "slack",
  DUMMY: "dummy",
} as const
export type ENotificationChannel =
  (typeof ENotificationChannel)[keyof typeof ENotificationChannel]

export const ETemplateMode = {
  BLOCKS: "blocks",
  RAW: "raw",
} as const
export type ETemplateMode = (typeof ETemplateMode)[keyof typeof ETemplateMode]

export const ETemplateSource = {
  SYSTEM: "system",
  DB: "db",
  EXTERNAL: "external",
} as const
export type ETemplateSource =
  (typeof ETemplateSource)[keyof typeof ETemplateSource]

export const EWhatsAppDriver = {
  META_CLOUD: "meta-cloud",
  OPENWA: "openwa",
  WAHA: "waha",
  EVOLUTION: "evolution",
} as const
export type EWhatsAppDriver =
  (typeof EWhatsAppDriver)[keyof typeof EWhatsAppDriver]

export const ESmsDriver = {
  TWILIO: "twilio",
  SIGNALHOUSE: "signalhouse",
  MSG91: "msg91",
  SMSAPI: "smsapi",
  WEBHOOK: "webhook",
  DUMMY: "dummy",
} as const
export type ESmsDriver = (typeof ESmsDriver)[keyof typeof ESmsDriver]

export const EDeliveryStatus = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  SKIPPED_IDEMPOTENT: "skipped_idempotent",
  SKIPPED_NO_CONSENT: "skipped_no_consent",
  RATE_LIMITED_DELAYED: "rate_limited_delayed",
} as const
export type EDeliveryStatus =
  (typeof EDeliveryStatus)[keyof typeof EDeliveryStatus]

export const EConsentStatus = {
  OPTED_IN: "opted_in",
  OPTED_OUT: "opted_out",
  PENDING: "pending",
} as const
export type EConsentStatus =
  (typeof EConsentStatus)[keyof typeof EConsentStatus]

export const EBroadcastStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  SENDING: "sending",
  COMPLETED: "completed",
  CANCELED: "canceled",
} as const
export type EBroadcastStatus =
  (typeof EBroadcastStatus)[keyof typeof EBroadcastStatus]
