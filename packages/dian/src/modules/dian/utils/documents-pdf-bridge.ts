import { MedusaError } from "@medusajs/framework/utils"
import {
  DIAN_ERROR_CODES,
  DOCUMENTS_MODULE_KEY,
  type DianDocumentBuildContext,
} from "../../../types"

export interface GenerateDianPdfViaDocumentsInput {
  context: DianDocumentBuildContext
  order: Record<string, any>
  container?: { resolve: (key: string) => unknown } | null
  documents_module_key?: string
}

export interface GenerateDianPdfViaDocumentsResult {
  pdf_buffer: Buffer
  pdf_document_id: string | null
  template_key: string
}

/**
 * Generates the official Colombian DIAN *Representación Gráfica* PDF by delegating
 * strictly to `@vicacha-devs/medusa-plugin-documents` (`documents` module).
 *
 * Fails closed with `DIAN_DOCUMENTS_PLUGIN_REQUIRED` if `@vicacha-devs/medusa-plugin-documents`
 * is not registered in the Medusa container.
 */
export async function generateDianPdfViaDocumentsPlugin(
  input: GenerateDianPdfViaDocumentsInput
): Promise<GenerateDianPdfViaDocumentsResult> {
  const { context, order, container } = input
  const moduleKey = input.documents_module_key || DOCUMENTS_MODULE_KEY

  let documentsService: Record<string, any> | null = null
  if (container && typeof container.resolve === "function") {
    const candidateKeys = [moduleKey, "documents", "documentsModuleService"]
    for (const key of candidateKeys) {
      try {
        const resolved = container.resolve(key) as Record<string, any> | null
        if (
          resolved &&
          typeof resolved === "object" &&
          typeof resolved.renderPdf === "function"
        ) {
          documentsService = resolved
          break
        }
      } catch {
        // Continue trying candidate keys
      }
    }
  }

  if (!documentsService) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "@vicacha-devs/medusa-plugin-documents is required to generate DIAN PDF representations (Representación Gráfica).",
      DIAN_ERROR_CODES.DOCUMENTS_PLUGIN_REQUIRED
    )
  }

  const mappedDocType: "invoice" | "credit_note" | "receipt" =
    context.document_type === "91" || context.document_type === "92"
      ? "credit_note"
      : context.document_type === "20"
        ? "receipt"
        : "invoice"

  const defaultTemplateKey =
    mappedDocType === "receipt"
      ? "pos_80mm"
      : mappedDocType === "credit_note"
        ? "credit_note"
        : "clean"

  let baseSettings: Record<string, any> = {}
  if (typeof documentsService.resolveSettings === "function") {
    try {
      baseSettings = await documentsService.resolveSettings(
        order?.region_id ?? null
      )
    } catch {
      baseSettings = {}
    }
  }

  const resolutionBanner = `Autorización Numeración de Facturación Electrónica DIAN No. ${context.resolution.resolution_number} vigente desde ${context.resolution.valid_from} hasta ${context.resolution.valid_to}. Prefijo ${context.resolution.prefix} desde el No. ${context.resolution.from_number} al ${context.resolution.to_number}.`
  const withholdingSummary =
    context.withholdings.length > 0
      ? `Retenciones informativas: ${context.withholdings
          .map(
            (w) =>
              `${w.withholding_name} (${w.rate}%): ${w.withholding_amount.toFixed(2)} ${context.currency_code}`
          )
          .join(" | ")}`
      : ""

  const dianFiscalNotes = [
    resolutionBanner,
    `${context.cufe_cude_algorithm}: ${context.cufe_cude}`,
    `Validación DIAN QR: ${context.qr_url}`,
    `Forma de Pago: ${context.payment_form === "1" ? "Contado (1)" : "Crédito (2)"} | Medio de Pago: ${context.payment_means}`,
    withholdingSummary,
    context.notes || baseSettings.notes || "",
  ]
    .filter(Boolean)
    .join("\n")

  const renderContext = {
    document_number: context.document_number,
    document_type: mappedDocType,
    version: 1,
    generated_at: `${context.issue_date}T${context.issue_time}`,
    locale: baseSettings.default_locale || "es",
    order: {
      id: String(order?.id || context.document_number),
      display_id: order?.display_id ?? context.consecutive,
      created_at:
        order?.created_at || `${context.issue_date}T${context.issue_time}`,
      currency_code: context.currency_code,
      email: context.buyer.email,
      region_id: order?.region_id ?? null,
      payment_method: `DIAN ${context.payment_means}`,
      subtotal: context.line_extension_amount,
      discount_total: context.allowance_total_amount,
      shipping_total: context.charge_total_amount,
      tax_total: context.taxes.reduce((acc, t) => acc + t.tax_amount, 0),
      total: context.payable_amount,
      customer: {
        id: context.buyer.customer_id ?? null,
        first_name:
          context.buyer.first_name || context.buyer.registration_name,
        last_name: context.buyer.last_name || "",
        email: context.buyer.email,
        phone: context.buyer.phone,
        company_name: context.buyer.is_b2b_legal_client
          ? context.buyer.registration_name
          : null,
      },
      billing_address: {
        first_name: context.buyer.registration_name,
        last_name: context.buyer.dv
          ? `NIT ${context.buyer.identification_number}-${context.buyer.dv}`
          : `Doc ${context.buyer.identification_number}`,
        company: context.buyer.is_b2b_legal_client
          ? context.buyer.registration_name
          : null,
        address_1: context.buyer.address_line,
        city: `${context.buyer.municipality_name} (${context.buyer.municipality_code})`,
        province: `${context.buyer.department_name} (${context.buyer.department_code})`,
        postal_code: context.buyer.postal_code || "110111",
        country_code: context.buyer.country_code,
        phone: context.buyer.phone,
      },
      shipping_address: order?.shipping_address ?? null,
      items: context.items.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.description ?? null,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.line_extension_amount,
        tax_total: item.taxes.reduce((acc, t) => acc + t.tax_amount, 0),
        discount_total: item.discount_amount,
        total:
          item.line_extension_amount +
          item.taxes.reduce((acc, t) => acc + t.tax_amount, 0),
      })),
      metadata: {
        ...(order?.metadata ?? {}),
        dian: {
          document_type: context.document_type,
          cufe_cude: context.cufe_cude,
          cufe_cude_algorithm: context.cufe_cude_algorithm,
          qr_url: context.qr_url,
          qr_data: context.qr_data,
          resolution_number: context.resolution.resolution_number,
          prefix: context.prefix,
          consecutive: context.consecutive,
        },
      },
    },
    settings: {
      captured_at: new Date().toISOString(),
      region_id: order?.region_id ?? null,
      company_name: context.seller.registration_name,
      company_address: context.seller.address_line,
      company_city: `${context.seller.municipality_name} (${context.seller.municipality_code})`,
      company_state: context.seller.department_name,
      company_postal_code: context.seller.postal_code,
      company_country: context.seller.country_code,
      company_tax_id: `${context.seller.nit}-${context.seller.dv}`,
      company_email: context.seller.email,
      company_phone: context.seller.phone,
      company_logo: baseSettings.company_logo ?? null,
      bank_details: baseSettings.bank_details ?? null,
      template_key: baseSettings[`${mappedDocType}_template`] || defaultTemplateKey,
      primary_color: baseSettings.primary_color || "#18181b",
      secondary_color: baseSettings.secondary_color || "#71717a",
      font_family: baseSettings.font_family || "Helvetica",
      locale: baseSettings.default_locale || "es",
      notes: dianFiscalNotes,
      footer_text: `Representación Gráfica de Facturación Electrónica DIAN • ${context.cufe_cude_algorithm}: ${context.cufe_cude.slice(0, 32)}...`,
      require_signature: false,
    },
    b2b: {
      is_b2b: context.buyer.is_b2b_legal_client,
      source: context.buyer.is_b2b_legal_client ? "b2b_module" : "none",
      company_id: context.buyer.company_id ?? null,
      company_name: context.buyer.is_b2b_legal_client
        ? context.buyer.registration_name
        : null,
      tax_id: context.buyer.dv
        ? `${context.buyer.identification_number}-${context.buyer.dv}`
        : context.buyer.identification_number,
      buyer_contact_email: context.buyer.email,
    },
    refund:
      mappedDocType === "credit_note"
        ? {
            id: `dian_cn_${context.document_number}`,
            amount: context.payable_amount,
            reason:
              context.discrepancy_response?.description ||
              "Nota Crédito Electrónica DIAN",
            reference_invoice_number:
              context.billing_reference?.invoice_number || null,
          }
        : null,
    related_document: context.billing_reference
      ? {
          id: context.billing_reference.invoice_number,
          document_number: context.billing_reference.invoice_number,
          document_type: "invoice" as const,
          generated_at: context.billing_reference.issue_date,
        }
      : null,
  }

  const pdfBuffer: Buffer = await documentsService.renderPdf(
    renderContext,
    baseSettings.custom_translations ?? null
  )

  let pdfDocumentId: string | null = null
  if (typeof documentsService.createDocuments === "function") {
    try {
      const created = await documentsService.createDocuments({
        order_id: String(order?.id || context.document_number),
        document_number: context.document_number,
        document_type: mappedDocType,
        status: "generated",
        version: 1,
        locale: renderContext.locale,
        template_id: renderContext.settings.template_key,
        file_url: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`,
        file_size: pdfBuffer.length,
        generated_at: new Date(),
        settings_snapshot: renderContext.settings,
        render_context_snapshot: renderContext,
        metadata: {
          dian_cufe_cude: context.cufe_cude,
          dian_document_type: context.document_type,
        },
      })
      const docRecord = Array.isArray(created) ? created[0] : created
      pdfDocumentId = docRecord?.id ?? null
    } catch {
      // Non-fatal if persistence in documents table is skipped in unit environments
    }
  }

  return {
    pdf_buffer: Buffer.isBuffer(pdfBuffer)
      ? pdfBuffer
      : Buffer.from(pdfBuffer),
    pdf_document_id: pdfDocumentId,
    template_key: renderContext.settings.template_key,
  }
}
