import { z } from "@medusajs/framework/zod"

export const OdooConfigSchema = z.object({
  url: z.string().min(1).max(512),
  db: z.string().min(1).max(128),
  username: z.string().min(1).max(128),
  password: z.string().max(512).optional(),
  apiKey: z.string().max(512).optional(),
  protocol: z.enum(["jsonrpc", "json2"]).optional(),
  companyId: z.number().int().positive().nullable().optional(),
  timeoutMs: z.number().int().min(1000).max(120000).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  rateLimitPerSec: z.number().int().min(1).max(200).optional(),
  allowPrivateNetwork: z.boolean().optional(),
  webhookSecret: z.string().max(512).optional(),
})

export const OdooVerifyConnectionSchema = OdooConfigSchema.partial()

export const OdooTriggerSyncSchema = z.object({
  direction: z
    .enum(["odoo_to_medusa", "medusa_to_odoo", "bidirectional"])
    .optional(),
  strategy: z
    .enum(["odoo_wins", "medusa_wins", "manual_conflict"])
    .optional(),
  driftThreshold: z.number().min(0).optional(),
})

export const OdooUpsertMappingSchema = z.object({
  entityType: z.enum([
    "product",
    "variant",
    "inventory",
    "order",
    "invoice",
    "customer",
    "warehouse",
    "category",
  ]),
  medusaId: z.string().min(1).max(256),
  odooId: z.number().int().positive(),
  direction: z
    .enum(["odoo_to_medusa", "medusa_to_odoo", "bidirectional"])
    .optional(),
  odooModel: z.string().max(128).optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const OdooResolveFailureSchema = z.object({
  id: z.string().min(1).max(256),
  resolvedBy: z.string().max(128).optional(),
})

export const OdooResolveConflictSchema = z.object({
  id: z.string().min(1).max(256),
  resolution: z.enum(["odoo_wins", "medusa_wins", "custom"]),
  customValue: z.unknown().optional(),
  resolvedBy: z.string().max(128).optional(),
})

export const OdooBarcodeLookupSchema = z.object({
  barcode: z.string().min(1).max(128),
  context: z
    .enum(["pos", "warehouse", "receiving", "stocktake"])
    .optional(),
})

export const OdooPosTransactionActionSchema = z.object({
  action: z.enum(["enqueue", "replay"]),
  id: z.string().max(256).optional(),
  externalTransactionId: z.string().max(256).optional(),
  customerId: z.string().max(256).optional(),
  customerEmail: z.string().email().max(256).optional(),
  currency: z.string().max(12).optional(),
  totalCents: z.number().int().min(0).optional(),
  discountCents: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().min(1).max(256),
        sku: z.string().max(128).optional(),
        title: z.string().max(256).optional(),
        quantity: z.number().int().positive(),
        unitPriceCents: z.number().int().min(0),
      })
    )
    .optional(),
  syncToOdoo: z.boolean().optional(),
})

export const OdooWebhookBodySchema = z.object({
  event_id: z.string().max(256).optional(),
  event: z.string().min(1).max(128),
  model: z.string().max(128).optional(),
  record_id: z.number().int().optional(),
  data: z.record(z.string(), z.unknown()),
  timestamp: z.string().max(64).optional(),
})

export type OdooConfigInput = z.infer<typeof OdooConfigSchema>
export type OdooVerifyConnectionInput = z.infer<typeof OdooVerifyConnectionSchema>
export type OdooTriggerSyncInput = z.infer<typeof OdooTriggerSyncSchema>
export type OdooUpsertMappingInput = z.infer<typeof OdooUpsertMappingSchema>
export type OdooResolveFailureInput = z.infer<typeof OdooResolveFailureSchema>
export type OdooResolveConflictInput = z.infer<typeof OdooResolveConflictSchema>
export type OdooBarcodeLookupInput = z.infer<typeof OdooBarcodeLookupSchema>
export type OdooPosTransactionActionInput = z.infer<
  typeof OdooPosTransactionActionSchema
>
export type OdooWebhookBodyInput = z.infer<typeof OdooWebhookBodySchema>
