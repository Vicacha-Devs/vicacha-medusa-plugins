import type {
  MpnChannel,
  MpnLocale,
  MpnRecipientRule,
  MpnSupportedEvent,
  MpnTemplateBlockType,
  MpnTemplateMode,
} from "./core"

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
