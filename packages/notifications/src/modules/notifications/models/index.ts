import { model } from "@medusajs/framework/utils"

export const MpnTemplate = model.define("mpn_template", {
  id: model.id({ prefix: "mpntpl" }).primaryKey(),
  name: model.text().searchable(),
  label: model.text().searchable(),
  description: model.text().nullable(),
  channel: model.text().default("email"),
  mode: model.text().default("blocks"), // "blocks" | "raw"
  locale: model.text().default("en"),
  subject: model.text().nullable(),
  raw_content: model.text().nullable(),
  variable_map: model.json().nullable(),
  meta_template_name: model.text().nullable(),
  meta_language_code: model.text().nullable(),
  styles: model.json().nullable(),
  is_active: model.boolean().default(true),
  source_preset_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export const MpnTemplateBlock = model.define("mpn_template_block", {
  id: model.id({ prefix: "mpnblk" }).primaryKey(),
  template_id: model.text(),
  type: model.text(),
  position: model.number().default(0),
  parent_id: model.text().nullable(),
  metadata: model.json().nullable(),
})

export const MpnEventMapping = model.define("mpn_event_mapping", {
  id: model.id({ prefix: "mpnmap" }).primaryKey(),
  event_name: model.text().searchable(),
  channel: model.text().default("email"),
  template_id: model.text(),
  recipient_rule: model.text().default("customer_auto"),
  custom_recipient: model.text().nullable(),
  sender_profile_index: model.number().default(1),
  telegram_thread_id: model.number().nullable(),
  attach_document_types: model.json().nullable(), // e.g. ["invoice", "packing_slip"]
  variable_map: model.json().nullable(),
  conditions: model.json().nullable(),
  is_active: model.boolean().default(true),
  priority: model.number().default(0),
  metadata: model.json().nullable(),
})

export const MpnDeliveryLog = model.define("mpn_delivery_log", {
  id: model.id({ prefix: "mpnlog" }).primaryKey(),
  idempotency_key: model.text(),
  event_name: model.text().searchable(),
  entity_id: model.text().nullable(),
  channel: model.text(),
  provider_id: model.text().nullable(),
  driver: model.text().nullable(),
  template_id: model.text().nullable(),
  mapping_id: model.text().nullable(),
  recipient_masked: model.text(),
  recipient_hash: model.text(),
  status: model.text().default("pending"),
  attempts: model.number().default(1),
  external_message_id: model.text().nullable(),
  payload_redacted: model.json().nullable(),
  error_code: model.text().nullable(),
  error_message: model.text().nullable(),
  sent_at: model.dateTime().nullable(),
  delivered_at: model.dateTime().nullable(),
})

export const MpnConsentRecord = model.define("mpn_consent_record", {
  id: model.id({ prefix: "mpncns" }).primaryKey(),
  identifier: model.text().searchable(), // E.164 phone or Telegram chat_id/username
  channel: model.text().default("sms"), // "sms" | "whatsapp" | "telegram"
  customer_id: model.text().nullable(),
  status: model.text().default("opted_in"), // "opted_in" | "opted_out" | "pending"
  source: model.text().default("checkout"), // "checkout" | "webhook_join" | "webhook_stop" | "telegram_bot_start" | "admin"
  first_message_sent: model.boolean().default(false),
  last_cart_recovery_at: model.dateTime().nullable(),
  opted_in_at: model.dateTime().nullable(),
  opted_out_at: model.dateTime().nullable(),
  metadata: model.json().nullable(),
})

export const MpnBroadcastCampaign = model.define("mpn_broadcast_campaign", {
  id: model.id({ prefix: "mpnbrc" }).primaryKey(),
  name: model.text().searchable(),
  channel: model.text().default("sms"), // "sms" | "whatsapp" | "telegram" | "email"
  template_id: model.text(),
  customer_group_id: model.text().nullable(),
  custom_recipients: model.json().nullable(),
  status: model.text().default("draft"), // "draft" | "scheduled" | "sending" | "completed" | "canceled"
  scheduled_at: model.dateTime().nullable(),
  sent_at: model.dateTime().nullable(),
  total_recipients: model.number().default(0),
  sent_count: model.number().default(0),
  failed_count: model.number().default(0),
  attributed_orders_count: model.number().default(0),
  attributed_revenue: model.number().default(0),
  metadata: model.json().nullable(),
})

export const MpnChannelConfig = model.define("mpn_channel_config", {
  id: model.id({ prefix: "mpncfg" }).primaryKey(),
  channel: model.text(), // "email" | "whatsapp" | "telegram" | "sms" | "slack" | "dummy"
  driver: model.text().default("default"),
  is_enabled: model.boolean().default(true),
  is_verified: model.boolean().default(false),
  verified_at: model.dateTime().nullable(),
  rate_limit_per_sec: model.number().default(10),
  config_json: model.json().nullable(), // Non-secret operational config (e.g. channel_id, thread_ids, sender profiles, WABA ID, OpenWA URL)
})

export const MpnSandboxMessage = model.define("mpn_sandbox_message", {
  id: model.id({ prefix: "mpnsbx" }).primaryKey(),
  channel: model.text().default("sms"),
  recipient: model.text().searchable(),
  sender: model.text().nullable(),
  subject: model.text().nullable(),
  body: model.text(),
  html: model.text().nullable(),
  otp_code: model.text().nullable(),
  media_urls: model.json().nullable(),
  attachments_meta: model.json().nullable(),
  metadata: model.json().nullable(),
})
