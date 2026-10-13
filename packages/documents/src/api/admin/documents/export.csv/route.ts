import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { DOCUMENTS_MODULE } from "../../../../modules/documents/types"
import DocumentsModuleService from "../../../../modules/documents/service"
import {
  AccountingCsvRow,
  generateAccountingCsv,
} from "../../../../modules/documents/utils/csv-exporter"

/**
 * GET /admin/documents/export.csv (Phase 7.3)
 * Exports filtered documents as a formula-injection-safe accounting CSV file.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { document_type, status, date_from, date_to, order_id } =
    req.query as Record<string, string | undefined>

  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const filters: Record<string, unknown> = {}
  if (document_type) filters.document_type = document_type
  if (status) filters.status = status
  if (order_id) filters.order_id = order_id
  if (date_from || date_to) {
    const createdAtFilter: Record<string, Date> = {}
    if (date_from) createdAtFilter.$gte = new Date(date_from)
    if (date_to) createdAtFilter.$lte = new Date(date_to)
    filters.created_at = createdAtFilter
  }

  const documents = await documentsService.listDocuments(filters, {
    take: 5000,
    order: { created_at: "DESC" },
  })

  const csvRows: AccountingCsvRow[] = documents.map((doc: any) => {
    const orderSnap = doc.render_context_snapshot?.order || {}
    const b2bSnap = doc.render_context_snapshot?.b2b || {}
    const isCreditNote = doc.document_type === "credit_note"
    const sign = isCreditNote ? -1 : 1

    const customerName =
      [
        orderSnap.customer?.first_name || orderSnap.billing_address?.first_name,
        orderSnap.customer?.last_name || orderSnap.billing_address?.last_name,
      ]
        .filter(Boolean)
        .join(" ") || null

    return {
      document_number: doc.document_number,
      document_type: doc.document_type,
      status: doc.status,
      version: doc.version ?? 1,
      order_id: doc.order_id,
      order_display_id: orderSnap.display_id ?? "",
      customer_name: customerName,
      customer_email: orderSnap.email ?? orderSnap.customer?.email ?? "",
      company_name:
        b2bSnap.company_name ?? orderSnap.billing_address?.company ?? "",
      buyer_tax_id: b2bSnap.tax_id ?? b2bSnap.vat_number ?? "",
      currency_code: orderSnap.currency_code ?? "",
      subtotal:
        orderSnap.subtotal !== undefined
          ? sign * Math.abs(Number(orderSnap.subtotal))
          : null,
      discount_total:
        orderSnap.discount_total !== undefined
          ? Number(orderSnap.discount_total)
          : null,
      shipping_total:
        orderSnap.shipping_total !== undefined
          ? sign * Math.abs(Number(orderSnap.shipping_total))
          : null,
      tax_total:
        orderSnap.tax_total !== undefined
          ? sign * Math.abs(Number(orderSnap.tax_total))
          : null,
      total:
        orderSnap.total !== undefined
          ? sign * Math.abs(Number(orderSnap.total))
          : null,
      locale: doc.locale ?? "en",
      region_id: doc.settings_snapshot?.region_id ?? "global",
      related_document_id: doc.related_document_id ?? "",
      generated_at: doc.generated_at ?? null,
      emailed_at: doc.emailed_at ?? null,
    }
  })

  const csvContent = generateAccountingCsv(csvRows)
  const dateSlug = new Date().toISOString().slice(0, 10)

  res.setHeader("Content-Type", "text/csv; charset=utf-8")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="documents-export-${dateSlug}.csv"`
  )
  return res.status(200).send(csvContent)
}
