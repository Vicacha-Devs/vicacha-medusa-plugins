import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http"
import { z } from "zod"
import {
  BLOCK_TYPES,
  CONTEXT_TYPES,
  NOTIFICATION_CHANNELS,
  RECIPIENT_RULES,
  SMS_DRIVERS,
  SUPPORTED_LOCALES,
  TEMPLATE_MODES,
  WHATSAPP_DRIVERS,
} from "../modules/notifications/types"

export const BlockInputSchema = z.object({
  id: z.string().max(120).optional(),
  type: z.enum(BLOCK_TYPES),
  position: z.number().int().min(0).default(0),
  parent_id: z.string().max(120).nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
})

export const CreateOrCloneTemplateSchema = z.object({
  clone_from_preset_id: z.string().max(120).optional(),
  name: z.string().min(1).max(150).optional(),
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional().default("email"),
  mode: z.enum(TEMPLATE_MODES).optional().default("blocks"),
  locale: z.enum(SUPPORTED_LOCALES).optional().default("en"),
  subject: z.string().max(300).nullable().optional(),
  raw_content: z.string().max(250000).nullable().optional(),
  variable_map: z.record(z.string()).nullable().optional(),
  meta_template_name: z.string().max(120).nullable().optional(),
  meta_language_code: z.string().max(16).nullable().optional(),
  styles: z.record(z.unknown()).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  blocks: z.array(BlockInputSchema).optional(),
})

export const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  label: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  mode: z.enum(TEMPLATE_MODES).optional(),
  locale: z.enum(SUPPORTED_LOCALES).optional(),
  subject: z.string().max(300).nullable().optional(),
  raw_content: z.string().max(250000).nullable().optional(),
  variable_map: z.record(z.string()).nullable().optional(),
  meta_template_name: z.string().max(120).nullable().optional(),
  meta_language_code: z.string().max(16).nullable().optional(),
  styles: z.record(z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
  blocks: z.array(BlockInputSchema).optional(),
})

export const RenderTemplatePreviewSchema = z.object({
  template_id: z.string().min(1).max(120),
  context_type: z.enum(CONTEXT_TYPES).optional().default("order"),
  entity_id: z.string().max(120).nullable().optional(),
  locale: z.string().max(16).nullable().optional(),
  data: z.record(z.unknown()).optional(),
  append_sms_consent_footer: z.boolean().optional(),
})

export const UpsertEventMappingSchema = z.object({
  event_name: z.string().min(1).max(120),
  channel: z.enum(NOTIFICATION_CHANNELS).default("email"),
  template_id: z.string().min(1).max(120),
  recipient_rule: z.enum(RECIPIENT_RULES).optional().default("customer_auto"),
  custom_recipient: z.string().max(255).nullable().optional(),
  sender_profile_index: z.number().int().min(1).max(5).optional().default(1),
  telegram_thread_id: z.number().int().positive().nullable().optional(),
  attach_document_types: z.array(z.string().max(40)).nullable().optional(),
  variable_map: z.record(z.string()).nullable().optional(),
  conditions: z
    .object({
      region_ids: z.array(z.string()).optional(),
      sales_channel_ids: z.array(z.string()).optional(),
      currency_codes: z.array(z.string()).optional(),
      min_order_total: z.number().min(0).optional(),
      document_types: z.array(z.string()).optional(),
      require_consent: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  is_active: z.boolean().optional().default(true),
  priority: z.number().int().min(-100).max(1000).optional().default(0),
})

export const UpdateChannelConfigSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS),
  driver: z
    .union([z.enum(WHATSAPP_DRIVERS), z.enum(SMS_DRIVERS), z.string().max(64)])
    .optional(),
  is_enabled: z.boolean().optional(),
  rate_limit_per_sec: z.number().int().min(1).max(500).optional(),
  config_json: z.record(z.unknown()).optional(),
  action: z.enum(["save", "verify"]).optional().default("save"),
  test_recipient: z.string().max(255).optional(),
})

export const ManualSendSchema = z.object({
  channel: z.enum(NOTIFICATION_CHANNELS).optional(),
  template_id: z.string().min(1).max(120).optional(),
  event_name: z.string().max(120).optional(),
  recipient: z.string().max(255).optional(),
  order_id: z.string().max(120).nullable().optional(),
  entity_id: z.string().max(120).nullable().optional(),
  locale: z.string().max(16).optional(),
  attach_document_types: z.array(z.string().max(40)).optional(),
  telegram_thread_id: z.number().int().positive().nullable().optional(),
  custom_data: z.record(z.unknown()).optional(),
})

export const CreateBroadcastSchema = z.object({
  name: z.string().min(1).max(150),
  channel: z.enum(["sms", "whatsapp", "telegram", "email"]).default("sms"),
  template_id: z.string().min(1).max(120),
  customer_group_id: z.string().max(120).nullable().optional(),
  custom_recipients: z.array(z.string().max(255)).max(500).nullable().optional(),
  send_now: z.boolean().optional().default(false),
  scheduled_at: z.string().nullable().optional(),
})

export const StoreConsentSchema = z.object({
  identifier: z.string().min(3).max(255),
  channel: z.enum(["sms", "whatsapp", "telegram"]).default("sms"),
  action: z.enum(["opt_in", "opt_out"]).default("opt_in"),
  cart_id: z.string().max(120).nullable().optional(),
})

/**
 * Storefront Anti-IDOR verification: ensures an authenticated customer can only manage
 * their own consent/notification preferences when `customer_id` is present.
 */
export function verifyStoreCustomerSession(req: MedusaRequest): {
  authenticated: boolean
  customerId: string | null
} {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type
  if (actorId && (!actorType || actorType === "customer")) {
    return { authenticated: true, customerId: String(actorId) }
  }
  return { authenticated: false, customerId: null }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/mpn/webhooks/*",
      bodyParser: { preserveRawBody: true },
      middlewares: [
        (
          _req: MedusaRequest,
          _res: MedusaResponse,
          next: MedusaNextFunction
        ) => {
          next()
        },
      ],
    },
  ],
})
