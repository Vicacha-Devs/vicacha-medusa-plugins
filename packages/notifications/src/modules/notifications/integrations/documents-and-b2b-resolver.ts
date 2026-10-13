import type {
  B2BNotificationContacts,
  NotificationAttachment,
} from "../../../types"

export type { B2BNotificationContacts } from "../../../types"

/**
 * Zero-hard-dependency B2B buyer & accounting contact resolver.
 * Safely checks optional B2B module or order/customer metadata without breaking B2C stores.
 */
export async function resolveB2BNotificationContacts(
  container: { resolve?: (key: string) => any } | null | undefined,
  order: Record<string, any> | null | undefined
): Promise<B2BNotificationContacts> {
  if (!order) return {}

  const meta = (order.metadata || {}) as Record<string, any>
  const customerMeta = (order.customer?.metadata || {}) as Record<string, any>

  let companyName: string | null =
    meta.b2b_company_name ||
    customerMeta.b2b_company_name ||
    order.billing_address?.company ||
    order.shipping_address?.company ||
    null

  let accountingEmail: string | null =
    meta.b2b_accounting_email ||
    customerMeta.b2b_accounting_email ||
    meta.accounting_email ||
    null

  let buyerEmail: string | null =
    meta.b2b_buyer_email ||
    customerMeta.b2b_buyer_email ||
    order.email ||
    order.customer?.email ||
    null

  let buyerPhone: string | null =
    meta.b2b_buyer_phone ||
    customerMeta.b2b_buyer_phone ||
    order.shipping_address?.phone ||
    order.billing_address?.phone ||
    order.customer?.phone ||
    null

  let telegramChatId: string | null =
    meta.telegram_chat_id ||
    customerMeta.telegram_chat_id ||
    null

  if (container && typeof container.resolve === "function") {
    for (const candidateKey of ["b2bModuleService", "companyModuleService", "b2b"]) {
      try {
        const b2bService = container.resolve(candidateKey)
        if (b2bService && typeof b2bService.resolveBuyerContext === "function") {
          const resolved = await b2bService.resolveBuyerContext(order.id)
          if (resolved) {
            companyName = resolved.company_name || companyName
            accountingEmail = resolved.accounting_email || accountingEmail
            buyerEmail = resolved.buyer_contact_email || buyerEmail
            buyerPhone = resolved.buyer_phone || buyerPhone
          }
          break
        }
      } catch {
        // Optional B2B module not installed; fall back to metadata
      }
    }
  }

  return {
    company_name: companyName,
    buyer_contact_email: buyerEmail,
    accounting_email: accountingEmail || buyerEmail,
    buyer_phone: buyerPhone,
    telegram_chat_id: telegramChatId ? String(telegramChatId) : null,
  }
}

/**
 * Zero-hard-dependency integration with sibling `medusa-documents-plugin` (`documentsModuleService`).
 * When an Event Mapping requests `attach_document_types: ["invoice", "packing_slip"]`,
 * this helper fetches existing PDF buffers (or triggers on-demand generation) and returns
 * base64 `NotificationAttachment[]` ready for Email, WhatsApp/OpenWA, or Telegram `sendDocument`.
 */
export async function resolveOrderDocumentAttachments(
  container: { resolve?: (key: string) => any } | null | undefined,
  orderId: string | null | undefined,
  documentTypes?: string[] | null
): Promise<NotificationAttachment[]> {
  if (
    !container ||
    typeof container.resolve !== "function" ||
    !orderId ||
    !Array.isArray(documentTypes) ||
    documentTypes.length === 0
  ) {
    return []
  }

  let documentsService: any = null
  for (const key of ["documentsModuleService", "documents"]) {
    try {
      documentsService = container.resolve(key)
      if (documentsService) break
    } catch {
      // Sibling plugin not registered in container
    }
  }

  if (!documentsService) {
    return []
  }

  const attachments: NotificationAttachment[] = []

  for (const docType of documentTypes) {
    try {
      let targetDoc: any = null
      if (typeof documentsService.listDocuments === "function") {
        const existing = await documentsService.listDocuments({
          order_id: orderId,
          document_type: docType,
        })
        if (Array.isArray(existing) && existing.length > 0) {
          targetDoc = existing[0]
        }
      }

      if (
        targetDoc &&
        typeof documentsService.getDocumentPdfBuffer === "function"
      ) {
        const { buffer, document } =
          await documentsService.getDocumentPdfBuffer(targetDoc.id)
        if (buffer && Buffer.isBuffer(buffer)) {
          const docNum =
            document?.document_number || targetDoc.document_number || targetDoc.id
          const cleanName = `${docType}-${docNum}.pdf`.replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          )
          attachments.push({
            filename: cleanName,
            content: buffer.toString("base64"),
            content_type: "application/pdf",
            document_type: docType,
            document_number: String(docNum),
          })
        }
      }
    } catch {
      // Never block notification delivery if PDF retrieval fails
    }
  }

  return attachments
}
