import type {
  SmsDriver,
  WhatsAppDriver,
} from "./core"

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
