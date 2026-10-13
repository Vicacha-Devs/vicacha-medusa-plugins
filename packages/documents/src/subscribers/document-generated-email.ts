import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { DOCUMENTS_MODULE, DocumentType } from "../modules/documents/types"
import DocumentsModuleService from "../modules/documents/service"
import { sanitizeFilename } from "../modules/documents/utils/formatters"

export async function sendDocumentEmailNotification(
  container: { resolve: (key: string) => any },
  params: {
    document_id: string
    recipient_email?: string | null
    actor_id?: string | null
    force?: boolean
  }
): Promise<{ sent: boolean; recipient?: string; reason?: string }> {
  const documentsService =
    container.resolve(DOCUMENTS_MODULE) as DocumentsModuleService

  const { buffer, document } = await documentsService.getDocumentPdfBuffer(
    params.document_id
  )

  const docType = (document.document_type || "invoice") as DocumentType
  const regionId = document.settings_snapshot?.region_id ?? null
  const settings = await documentsService.resolveSettings(regionId)

  const autoToggleField = `auto_email_${docType}`
  if (!params.force && !settings[autoToggleField]) {
    return { sent: false, reason: `${autoToggleField} is disabled` }
  }

  const recipient =
    params.recipient_email?.trim() ||
    document.render_context_snapshot?.order?.email ||
    document.render_context_snapshot?.b2b?.buyer_contact_email ||
    null

  if (!recipient) {
    return { sent: false, reason: "No recipient email found on order" }
  }

  const notificationService = container.resolve(Modules.NOTIFICATION) as any
  if (
    !notificationService ||
    typeof notificationService.createNotifications !== "function"
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Medusa Notification Module is not available"
    )
  }

  const filename = sanitizeFilename(
    `${docType}-${document.document_number}.pdf`
  )

  await notificationService.createNotifications({
    to: recipient,
    channel: "email",
    template: `document-${docType.replace(/_/g, "-")}`,
    data: {
      document_id: document.id,
      document_number: document.document_number,
      document_type: docType,
      order_id: document.order_id,
      order_display_id:
        document.render_context_snapshot?.order?.display_id ??
        document.order_id,
      company_name:
        document.settings_snapshot?.company_name || settings.company_name,
    },
    attachments: [
      {
        filename,
        content: buffer.toString("base64"),
        content_type: "application/pdf",
      },
    ],
  })

  const now = new Date()
  await documentsService.updateDocuments({
    id: document.id,
    emailed_at: now,
  })
  await documentsService.appendAuditLog(document.id, {
    event: "emailed",
    actor_id: params.actor_id ?? null,
    details: { recipient, filename },
  })

  return { sent: true, recipient }
}

export default async function documentGeneratedEmailHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id?: string
  document_id?: string
  document_type?: DocumentType
  order_id?: string
}>) {
  const documentId = data?.document_id || data?.id
  if (!documentId) return

  try {
    await sendDocumentEmailNotification(container, {
      document_id: documentId,
      force: false,
    })
  } catch {
    // Non-blocking in event subscriber if Notification provider is not configured
  }
}

export const config: SubscriberConfig = {
  event: "document.generated",
}
