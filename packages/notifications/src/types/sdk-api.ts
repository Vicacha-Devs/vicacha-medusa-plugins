import type {
  MpnChannel,
  MpnLocale,
  MpnRecipientRule,
  MpnSupportedEvent,
  MpnTemplateMode,
} from "./core"
import type {
  MpnBroadcastRecord,
  MpnChannelConfigRecord,
  MpnConsentSummary,
  MpnEventMappingRecord,
  MpnLogRecord,
  MpnSandboxMessageRecord,
  MpnTemplateBlockRecord,
  MpnTemplateRecord,
} from "./records"

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
  subject?: string | null
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
