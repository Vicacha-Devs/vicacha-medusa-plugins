import type {
  BlockType,
  ContextType,
  NotificationChannel,
  NotificationsPluginOptions,
  TemplateMode,
} from "./core"
import type {
  NotificationAttachment,
  TemplateBlockNode,
} from "./domain"

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
  arrayPath?: string
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
