export * from "./constants"
export * from "./enums"
export * from "./errors"

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
import type { NotificationsApiClient } from "../sdk/client"

// ─────────────────────────────────────────────────────────────────────────────
// 1. Core Plugin Configuration & Utils
// ─────────────────────────────────────────────────────────────────────────────

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

export interface ExternalTemplateService {
  id: string
  label: string
  channel: NotificationChannel
  render: (params: {
    templateId: string
    context: Record<string, any>
    locale: string
    translations: Record<string, any>
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

// ─────────────────────────────────────────────────────────────────────────────
// 2. Domain / Module Schemas & Render Payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface TemplateBlockNode {
  id: string
  type: BlockType
  position: number
  parent_id?: string | null
  metadata: Record<string, any>
  children?: TemplateBlockNode[]
}

export interface NotificationAttachment {
  filename: string
  content: string // base64 encoded
  content_type: string
  document_type?: string
  document_number?: string
}

export interface TelegramInlineButton {
  text: string
  url?: string
  callback_data?: string
}

export interface WhatsAppInteractiveButton {
  id: string
  title: string
  url?: string
}

export interface RenderedNotificationPayload {
  channel: NotificationChannel
  template_id: string
  template_name: string
  locale: SupportedLocale
  subject?: string
  html?: string
  text: string
  blocks_json?: Array<Record<string, any>>
  telegram_options?: {
    parse_mode: "HTML"
    message_thread_id?: number | null
    inline_keyboard?: TelegramInlineButton[][]
    disable_web_page_preview?: boolean
  }
  whatsapp_options?: {
    driver?: WhatsAppDriver
    message_type: "template" | "text" | "interactive" | "document"
    meta_template_name?: string | null
    meta_language_code?: string
    meta_components?: Array<Record<string, any>>
    buttons?: WhatsAppInteractiveButton[]
  }
  sms_options?: {
    encoding: "GSM-7" | "UCS-2"
    segments: number
    character_count: number
    media_urls?: string[]
    consent_footer_appended?: boolean
  }
  attachments?: NotificationAttachment[]
}

export interface EventMappingCondition {
  region_ids?: string[]
  sales_channel_ids?: string[]
  currency_codes?: string[]
  min_order_total?: number
  document_types?: string[]
  require_consent?: boolean
}

export interface SenderProfileConfig {
  index: number
  name: string
  from_address: string
  reply_to?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Internal / Workflow / Service Payloads
// ─────────────────────────────────────────────────────────────────────────────

export interface MpnTemplateBlockRecord {
  id: string
  template_id?: string
  type: MpnTemplateBlockType | string
  position: number
  parent_id?: string | null
  metadata?: Record<string, any>
  children?: MpnTemplateBlockRecord[]
}

export interface MpnTemplateRecord {
  id: string
  name?: string
  label: string
  channel: MpnChannel | string
  locale?: MpnLocale | string
  subject?: string | null
  mode?: MpnTemplateMode | string
  raw_content?: string | null
  meta_template_name?: string | null
  source?: "system" | "database" | string
  is_active?: boolean
  [key: string]: any
}

export interface MpnEventMappingRecord {
  id: string
  event_name: MpnSupportedEvent | string
  channel: MpnChannel | string
  template_id: string
  recipient_rule: MpnRecipientRule | string
  custom_recipients?: string[] | null
  telegram_thread_id?: number | null
  attach_document_types?: string[] | null
  is_active: boolean
  [key: string]: any
}

export interface MpnChannelConfigRecord {
  id?: string
  channel: MpnChannel | string
  driver: string
  config_json: Record<string, any>
  is_verified?: boolean
  is_active?: boolean
  [key: string]: any
}

export interface MpnLogRecord {
  id: string
  channel: MpnChannel | string
  driver?: string
  event_name?: string | null
  template_id?: string | null
  entity_id?: string | null
  recipient_masked: string
  status: string
  error_message?: string | null
  created_at?: string
  [key: string]: any
}

export interface MpnBroadcastRecord {
  id: string
  name: string
  channel: MpnChannel | string
  template_id: string
  status: string
  sent_count: number
  total_recipients: number
  [key: string]: any
}

export interface MpnConsentSummary {
  opted_in_sms: number
  opted_in_whatsapp: number
  opted_in_telegram: number
  opted_out_total: number
  [key: string]: any
}

export interface MpnSandboxMessageRecord {
  id: string
  channel: MpnChannel | string
  recipient: string
  subject?: string | null
  body: string
  otp_code?: string | null
  created_at?: string
  [key: string]: any
}

export interface NotificationTranslationDictionary {
  general: {
    hello: string
    thankYou: string
    questionsContact: string
    viewInStore: string
    poweredBy: string
    unsubscribeSms: string
  }
  order: {
    placedSubject: string
    placedTitle: string
    placedIntro: string
    completedSubject: string
    completedTitle: string
    canceledSubject: string
    canceledTitle: string
    updatedSubject: string
    updatedTitle: string
    orderNumber: string
    orderDate: string
    orderStatus: string
    paymentStatus: string
    fulfillmentStatus: string
    itemsHeader: string
    quantity: string
    unitPrice: string
    subtotal: string
    shipping: string
    tax: string
    discount: string
    total: string
    shippingAddress: string
    billingAddress: string
    trackOrderButton: string
    downloadInvoiceButton: string
  }
  shipment: {
    shippedSubject: string
    shippedTitle: string
    shippedIntro: string
    deliveredSubject: string
    deliveredTitle: string
    carrier: string
    trackingNumber: string
    trackPackageButton: string
  }
  inventory: {
    lowStockSubject: string
    lowStockTitle: string
    sku: string
    location: string
    stockedQuantity: string
    reservedQuantity: string
    availableQuantity: string
  }
  customer: {
    welcomeSubject: string
    welcomeTitle: string
    welcomeIntro: string
    otpSubject: string
    otpMessage: string
  }
  cart: {
    recoverySubject: string
    recoveryTitle: string
    recoveryIntro: string
    resumeCartButton: string
  }
  document: {
    readySubject: string
    readyTitle: string
    readyIntro: string
  }
}

export interface B2BNotificationContacts {
  company_name?: string | null
  buyer_contact_email?: string | null
  accounting_email?: string | null
  buyer_phone?: string | null
  telegram_chat_id?: string | null
}

export interface MultiInterpolateOptions {
  escapeHtmlValues?: boolean
  removeUnmatched?: boolean
  maxPasses?: number
}

export interface SystemTemplatePreset {
  id: string
  name: string
  label: string
  description: string
  channel: NotificationChannel
  mode: TemplateMode
  default_event: string
  subject?: string
  raw_content?: string
  meta_template_name?: string
  meta_language_code?: string
  variable_map?: Record<string, string>
  blocks: Array<{
    id: string
    type: BlockType
    position: number
    parent_id?: string | null
    metadata: Record<string, any>
  }>
}

export interface RenderTemplateInput {
  template_id: string
  template_name: string
  channel: NotificationChannel
  mode: TemplateMode
  locale?: string | null
  subject?: string | null
  raw_content?: string | null
  blocks?: TemplateBlockNode[]
  variable_map?: Record<string, string> | null
  meta_template_name?: string | null
  meta_language_code?: string | null
  styles?: Record<string, any> | null
  data: Record<string, any>
  translations?: Record<string, any>
  pluginOptions?: NotificationsPluginOptions
  attachments?: NotificationAttachment[]
  telegram_thread_id?: number | null
  append_sms_consent_footer?: boolean
}

export interface HydrateEntityContextInput {
  event_name?: string
  context_type?: ContextType
  entity_id?: string | null
  event_data?: Record<string, any> | null
  locale?: string | null
}

export interface SmtpEmailProviderOptions {
  channels?: string[]
  host?: string
  port?: number
  secure?: boolean
  user?: string
  pass?: string
  from_name?: string
  from_address?: string
  webhook_url?: string
  api_key?: string
  allow_localhost?: boolean
}

export interface WhatsAppProviderOptions {
  channels?: string[]
  driver?: WhatsAppDriver
  enabled?: boolean
  // Official Meta Cloud API options
  accessToken?: string
  wabaId?: string
  phoneNumberId?: string
  graphAPIVersion?: string
  // Self-hosted OpenWA (@open-wa/wa-automate) / WAHA / Evolution API options
  gatewayUrl?: string
  gatewayApiKey?: string
  sessionId?: string
  allowLocalhost?: boolean
  timeoutMs?: number
}

export interface TelegramProviderOptions {
  channels?: string[]
  botToken?: string
  defaultChannelId?: string
  globalRateLimitPerSec?: number
  perChatRateLimitPerSec?: number
}

export interface SmsProviderOptions {
  channels?: string[]
  driver?: SmsDriver
  // Twilio options (medusa-twilio-sms compatible)
  account_sid?: string
  auth_token?: string
  from_number?: string
  messaging_service_sid?: string
  max_retries?: number
  retry_delay?: number
  // Signal House options (@signalhouse-sms/medusa-plugin compatible)
  signalhouse_api_key?: string
  signalhouse_sender_number?: string
  signalhouse_base_url?: string
  // MSG91 Flow options (medusa-msg91 compatible)
  msg91_auth_key?: string
  msg91_flow_id?: string
  msg91_sender_id?: string
  // SMSAPI options (@yanchesky/medusa-smsapi compatible)
  smsapi_token?: string
  smsapi_from?: string
  // Generic HTTP Webhook SMS gateway
  webhook_url?: string
  webhook_api_key?: string
  allow_localhost?: boolean
}

export interface SlackProviderOptions {
  channels?: string[]
  webhook_url?: string
  bot_token?: string
  default_channel?: string
  allow_localhost?: boolean
}

export interface DummySandboxProviderOptions {
  channels?: string[]
  maxStoredMessages?: number
}

export interface CapturedSandboxEntry {
  id: string
  channel: string
  recipient: string
  sender: string | null
  subject: string | null
  body: string
  html: string | null
  otp_code: string | null
  media_urls: string[]
  attachments_meta: Array<{ filename: string; content_type: string }>
  created_at: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Plugin Admin & Store SDK
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationsApiClientOptions {
  headers?: Record<string, string>
  publishableApiKey?: string
  credentials?: RequestCredentials
  fetchImpl?: typeof fetch
}

export interface ListMpnTemplatesParams {
  channel?: MpnChannel | string
  locale?: MpnLocale | string
}

export interface ListMpnTemplatesResponse {
  success?: boolean
  templates: MpnTemplateRecord[]
}

export interface GetMpnTemplateResponse {
  success?: boolean
  template: MpnTemplateRecord
  blocks: MpnTemplateBlockRecord[]
  flat_blocks: MpnTemplateBlockRecord[]
}

export interface CreateOrCloneMpnTemplatePayload {
  clone_from_preset_id?: string
  name?: string
  label?: string
  channel?: MpnChannel | string
  locale?: MpnLocale | string
  subject?: string | null
  mode?: MpnTemplateMode | string
  raw_content?: string | null
  meta_template_name?: string | null
  blocks?: Array<Record<string, any>>
}

export interface UpdateMpnTemplatePayload {
  label?: string
  subject?: string | null
  mode?: MpnTemplateMode | string
  raw_content?: string | null
  meta_template_name?: string | null
  is_active?: boolean
  blocks?: Array<Record<string, any>>
}

export interface SaveMpnTemplateResponse {
  success?: boolean
  template: MpnTemplateRecord
  blocks?: MpnTemplateBlockRecord[]
}

export interface DeleteMpnTemplateResponse {
  success?: boolean
  deleted: string
}

export interface RenderMpnTemplatePayload {
  template_id: string
  context_type?: string
  locale?: MpnLocale | string
  data?: Record<string, any>
  append_sms_consent_footer?: boolean
}

export interface RenderMpnTemplateResponse {
  success?: boolean
  rendered: {
    subject?: string
    html?: string
    text?: string
    [key: string]: any
  }
}

export interface ListMpnMappingsResponse {
  success?: boolean
  mappings: MpnEventMappingRecord[]
  supported_events: string[]
}

export interface CreateMpnMappingPayload {
  event_name: MpnSupportedEvent | string
  channel: MpnChannel | string
  template_id: string
  recipient_rule?: MpnRecipientRule | string
  custom_recipients?: string[] | null
  telegram_thread_id?: number | null
  attach_document_types?: string[] | null
  is_active?: boolean
}

export interface SaveMpnMappingResponse {
  success?: boolean
  mapping: MpnEventMappingRecord
}

export interface DeleteMpnMappingResponse {
  success?: boolean
  deleted: string
}

export interface ListMpnChannelsResponse {
  success?: boolean
  channels: MpnChannelConfigRecord[]
}

export interface SaveOrVerifyMpnChannelPayload {
  channel: MpnChannel | string
  driver: string
  config_json?: Record<string, any>
  action?: "save" | "verify"
}

export interface SaveOrVerifyMpnChannelResponse {
  success?: boolean
  channel?: MpnChannelConfigRecord
  verified?: boolean
  message?: string
}

export interface ListMpnLogsParams {
  channel?: MpnChannel | string
  status?: string
  entity_id?: string
  limit?: number
}

export interface ListMpnLogsResponse {
  success?: boolean
  logs: MpnLogRecord[]
}

export interface ListMpnBroadcastsResponse {
  success?: boolean
  broadcasts: MpnBroadcastRecord[]
  consent_summary: MpnConsentSummary | null
}

export interface CreateMpnBroadcastPayload {
  name: string
  channel: MpnChannel | string
  template_id: string
  send_now?: boolean
  scheduled_at?: string | null
}

export interface CreateMpnBroadcastResponse {
  success?: boolean
  broadcast: MpnBroadcastRecord
}

export interface ListMpnSandboxParams {
  channel?: MpnChannel | string
  recipient?: string
  limit?: number
}

export interface ListMpnSandboxResponse {
  success?: boolean
  messages: MpnSandboxMessageRecord[]
}

export interface ClearMpnSandboxResponse {
  success?: boolean
  cleared?: boolean
}

export interface SendMpnNotificationPayload {
  channel: MpnChannel | string
  recipient: string
  template_id?: string
  order_id?: string
  context_type?: string
  locale?: MpnLocale | string
  subject?: string
  text?: string
  html?: string
  data?: Record<string, any>
  attach_invoice_pdf?: boolean
  attach_document_types?: Array<
    "invoice" | "packing_slip" | "credit_note" | "receipt"
  >
  thread_id?: number
}

export interface SendMpnNotificationResponse {
  success?: boolean
  result?: Record<string, any>
  log?: MpnLogRecord
}

export interface StoreUpdateConsentPayload {
  identifier: string
  channel: "sms" | "whatsapp" | "telegram" | "email"
  action: "opt_in" | "opt_out"
  cart_id?: string
}

export interface StoreUpdateConsentResponse {
  success: boolean
  consent: {
    id: string
    channel: string
    identifier_masked: string
    status: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Plugin Hooks
// ─────────────────────────────────────────────────────────────────────────────

export interface NotificationsQueryHookOptions<TData = unknown> {
  client?: NotificationsApiClient
  queryKey?: readonly unknown[]
  enabled?: boolean
  onSuccess?: (data: TData) => void
  onError?: (error: Error) => void
}

export interface NotificationsMutationHookOptions<
  TData = unknown,
  TVariables = unknown,
> {
  client?: NotificationsApiClient
  queryKey?: readonly unknown[]
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: Error, variables: TVariables) => void
}

export interface UseNotificationsQueryResult<TData> {
  data: TData | undefined
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  refetch: () => Promise<TData | undefined>
}

export interface UseNotificationsMutationResult<TData, TVariables> {
  mutate: (
    variables: TVariables,
    callOptions?: {
      onSuccess?: (data: TData, variables: TVariables) => void
      onError?: (error: Error, variables: TVariables) => void
    }
  ) => void
  mutateAsync: (variables: TVariables) => Promise<TData>
  isPending: boolean
  error: Error | null
  data: TData | undefined
  reset: () => void
}

export interface UseOrderNotificationsWidgetStateProps {
  order?: Record<string, any>
  client?: NotificationsApiClient
  t?: (key: string, options?: Record<string, any>) => string
}
