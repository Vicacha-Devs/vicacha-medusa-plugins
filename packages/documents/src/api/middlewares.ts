import {
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import {
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  PAGE_ORIENTATIONS,
  PAGE_SIZES,
  TEMPLATE_ENGINES,
} from "../modules/documents/types"

export const GenerateDocumentSchema = z.object({
  order_id: z.string().min(1, "order_id is required"),
  document_type: z.enum(DOCUMENT_TYPES).optional().default("invoice"),
  template_id: z.string().nullable().optional(),
  locale: z.string().max(16).nullable().optional(),
  fulfillment_id: z.string().nullable().optional(),
  refund_id: z.string().nullable().optional(),
  refund_amount: z.number().nullable().optional(),
  refund_reason: z.string().max(500).nullable().optional(),
  related_document_id: z.string().nullable().optional(),
  force_new_version: z.boolean().optional().default(false),
  metadata: z.record(z.unknown()).nullable().optional(),
})

export const UpdateSettingsSchema = z
  .object({
    region_id: z.string().nullable().optional(),
    company_name: z.string().max(200).optional(),
    company_address: z.string().max(500).optional(),
    company_line2: z.string().max(200).nullable().optional(),
    company_city: z.string().max(120).nullable().optional(),
    company_state: z.string().max(120).nullable().optional(),
    company_postal_code: z.string().max(40).nullable().optional(),
    company_country: z.string().max(10).nullable().optional(),
    company_tax_id: z.string().max(100).nullable().optional(),
    company_email: z.string().email().or(z.literal("")).nullable().optional(),
    company_phone: z.string().max(60).nullable().optional(),
    company_website: z.string().max(255).nullable().optional(),
    company_logo: z.string().max(2048).nullable().optional(),
    bank_details: z.string().max(2000).nullable().optional(),

    invoice_prefix: z.string().max(20).optional(),
    invoice_number_format: z.string().max(100).optional(),
    next_invoice_number: z.number().int().min(1).optional(),
    invoice_forced_next_number: z.number().int().min(1).nullable().optional(),
    invoice_number_padding: z.number().int().min(1).max(12).optional(),

    packing_slip_prefix: z.string().max(20).optional(),
    packing_slip_number_format: z.string().max(100).optional(),
    next_packing_slip_number: z.number().int().min(1).optional(),
    packing_slip_forced_next_number: z
      .number()
      .int()
      .min(1)
      .nullable()
      .optional(),
    packing_slip_number_padding: z.number().int().min(1).max(12).optional(),

    credit_note_prefix: z.string().max(20).optional(),
    credit_note_number_format: z.string().max(100).optional(),
    next_credit_note_number: z.number().int().min(1).optional(),
    credit_note_forced_next_number: z
      .number()
      .int()
      .min(1)
      .nullable()
      .optional(),
    credit_note_number_padding: z.number().int().min(1).max(12).optional(),

    receipt_prefix: z.string().max(20).optional(),
    receipt_number_format: z.string().max(100).optional(),
    next_receipt_number: z.number().int().min(1).optional(),
    receipt_forced_next_number: z.number().int().min(1).nullable().optional(),
    receipt_number_padding: z.number().int().min(1).max(12).optional(),

    invoice_template: z.string().max(100).optional(),
    packing_slip_template: z.string().max(100).optional(),
    credit_note_template: z.string().max(100).optional(),
    receipt_template: z.string().max(100).optional(),

    primary_color: z.string().max(32).optional(),
    secondary_color: z.string().max(32).optional(),
    font_family: z.string().max(64).optional(),
    styles_override: z.record(z.unknown()).nullable().optional(),
    sections_override: z.record(z.unknown()).nullable().optional(),

    default_locale: z.string().max(16).optional(),
    custom_translations: z.record(z.record(z.string())).nullable().optional(),
    notes: z.string().max(10000).nullable().optional(),
    footer_text: z.string().max(1000).nullable().optional(),

    auto_generate_invoice: z.boolean().optional(),
    auto_generate_packing_slip: z.boolean().optional(),
    auto_generate_credit_note: z.boolean().optional(),
    auto_generate_receipt: z.boolean().optional(),

    auto_email_invoice: z.boolean().optional(),
    auto_email_packing_slip: z.boolean().optional(),
    auto_email_credit_note: z.boolean().optional(),
    auto_email_receipt: z.boolean().optional(),

    require_signature: z.boolean().optional(),
    docuseal_template_id: z.string().max(100).nullable().optional(),
    signature_role: z.string().max(64).optional(),
  })
  .passthrough()

export const TemplateSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().max(500).nullable().optional(),
  document_type: z.enum(DOCUMENT_TYPES).optional().default("invoice"),
  engine: z.enum(TEMPLATE_ENGINES).optional().default("handlebars"),
  preset_key: z.string().max(64).nullable().optional(),
  page_size: z.enum(PAGE_SIZES).optional().default("A4"),
  orientation: z.enum(PAGE_ORIENTATIONS).optional().default("portrait"),
  html_content: z.string().max(250000).nullable().optional(),
  styles: z.record(z.unknown()).nullable().optional(),
  sections: z.record(z.unknown()).nullable().optional(),
  is_default: z.boolean().optional().default(false),
})

export const BulkGenerateSchema = z.object({
  order_ids: z.array(z.string().min(1)).min(1).max(100),
  document_type: z.enum(DOCUMENT_TYPES).optional().default("invoice"),
  template_id: z.string().nullable().optional(),
  locale: z.string().max(16).nullable().optional(),
  force_new_version: z.boolean().optional().default(false),
})

export const BulkDownloadSchema = z.object({
  document_ids: z.array(z.string().min(1)).min(1).max(100),
})

export const SendForSignatureSchema = z.object({
  signer_email: z.string().email().optional(),
  signer_name: z.string().max(150).nullable().optional(),
  role: z.string().max(64).nullable().optional(),
  template_id: z.union([z.string(), z.number()]).nullable().optional(),
  send_email: z.boolean().optional().default(true),
})

export const ListDocumentsQuerySchema = z.object({
  order_id: z.string().optional(),
  document_type: z.enum(DOCUMENT_TYPES).optional(),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  is_stale: z.enum(["true", "false"]).optional(),
  q: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

/**
 * Verifies that an authenticated storefront customer owns the requested `order_id`
 * to prevent Insecure Direct Object Reference (IDOR / CWE-639).
 */
export async function assertCustomerOwnsOrder(
  req: MedusaRequest,
  orderId: string
): Promise<{ allowed: boolean; status: number; message?: string }> {
  const actorId = (req as any).auth_context?.actor_id
  const actorType = (req as any).auth_context?.actor_type

  if (!actorId || (actorType && actorType !== "customer")) {
    return {
      allowed: false,
      status: 401,
      message: "Authentication required to access order documents",
    }
  }

  try {
    let orderCustomerId: string | null = null

    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
      if (query && typeof query.graph === "function") {
        const { data } = await query.graph({
          entity: "order",
          fields: ["id", "customer_id"],
          filters: { id: orderId },
        })
        if (Array.isArray(data) && data.length > 0) {
          orderCustomerId = data[0].customer_id ?? null
        }
      }
    } catch {
      const orderModule = req.scope.resolve(Modules.ORDER) as any
      const order = await orderModule.retrieveOrder(orderId)
      orderCustomerId = order?.customer_id ?? null
    }

    if (!orderCustomerId || orderCustomerId !== actorId) {
      return {
        allowed: false,
        status: 403,
        message: "You do not have permission to access documents for this order",
      }
    }

    return { allowed: true, status: 200 }
  } catch {
    return {
      allowed: false,
      status: 404,
      message: "Order not found",
    }
  }
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/documents/webhooks/docuseal",
      bodyParser: { preserveRawBody: true },
      middlewares: [
        (req: MedusaRequest, _res: MedusaResponse, next: MedusaNextFunction) => {
          next()
        },
      ],
    },
  ],
})
