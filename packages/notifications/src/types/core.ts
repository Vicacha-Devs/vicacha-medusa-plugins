import type {
  BLOCK_TYPES,
  BROADCAST_STATUSES,
  CONSENT_STATUSES,
  CONTEXT_TYPES,
  DELIVERY_STATUSES,
  NOTIFICATION_CHANNELS,
  RECIPIENT_RULES,
  SMS_DRIVERS,
  SUPPORTED_EVENTS,
  SUPPORTED_LOCALES,
  TEMPLATE_MODES,
  TEMPLATE_SOURCES,
  WHATSAPP_DRIVERS,
} from "./constants"
import type {
  RenderedNotificationPayload,
} from "./domain"

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
export type TemplateMode = (typeof TEMPLATE_MODES)[number]
export type TemplateSource = (typeof TEMPLATE_SOURCES)[number]
export type BlockType = (typeof BLOCK_TYPES)[number]
export type WhatsAppDriver = (typeof WHATSAPP_DRIVERS)[number]
export type SmsDriver = (typeof SMS_DRIVERS)[number]
export type RecipientRule = (typeof RECIPIENT_RULES)[number]
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]
export type ConsentStatus = (typeof CONSENT_STATUSES)[number]
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number]
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]
export type SupportedEventName = (typeof SUPPORTED_EVENTS)[number] | string
export type ContextType = (typeof CONTEXT_TYPES)[number]

// SDK & Hook Aliases
export type MpnChannel = NotificationChannel
export type MpnLocale = SupportedLocale
export type MpnRecipientRule = RecipientRule
export type MpnSupportedEvent = SupportedEventName
export type MpnTemplateBlockType = BlockType
export type MpnTemplateMode = TemplateMode

export interface MappedNotificationError {
  code: string
  message: string
  retryable: boolean
}

export interface StatusBannerState {
  type: "success" | "error"
  text: string
}

export interface ExternalTemplateModuleConfig {
  name: string
  module?: Record<string, any>
  path?: string
}

export interface ExternalTemplateService {
  id: string
  label?: string
  channel?: NotificationChannel
  templates?: ExternalTemplateModuleConfig[]
  render?: (params: {
    templateId: string
    context: Record<string, any>
    locale: string
    translations: Record<string, any>
    subject?: string | null
  }) => Promise<Partial<RenderedNotificationPayload>>
  getSystemTemplates?: () => Array<{
    id: string
    name: string
    label: string
    description?: string
    channel: NotificationChannel
  }>
}

export interface NotificationsPluginOptions {
  defaultLocale?: SupportedLocale
  storeName?: string
  storeUrl?: string
  logoUrl?: string
  customTranslations?: Partial<Record<SupportedLocale, Record<string, any>>>
  logRetentionDays?: number
  sendConcurrency?: number
  enableCartRecovery?: boolean
  cartAbandonmentThresholdMinutes?: number
  cartRecoveryUrlBase?: string
  enableBroadcasts?: boolean
  attributionWindowDays?: number
  requireSmsConsent?: boolean
  requireWhatsAppConsent?: boolean
  extend?: {
    services?: ExternalTemplateService[]
  }
}
