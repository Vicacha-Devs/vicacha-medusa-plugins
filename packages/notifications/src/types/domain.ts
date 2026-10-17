import type {
  BlockType,
  NotificationChannel,
  SupportedLocale,
  WhatsAppDriver,
} from "./core"

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
