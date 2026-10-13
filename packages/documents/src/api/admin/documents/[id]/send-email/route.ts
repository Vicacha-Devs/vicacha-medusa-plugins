import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { sendDocumentEmailNotification } from "../../../../../subscribers/document-generated-email"

/**
 * POST /admin/documents/:id/send-email
 * Manually sends or resends a generated document PDF attachment via Medusa Notification Module.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const body = (req.body || {}) as { recipient_email?: string | null }
  const actorId = (req as any).auth_context?.actor_id ?? null

  try {
    const result = await sendDocumentEmailNotification(req.scope, {
      document_id: id,
      recipient_email: body.recipient_email ?? null,
      actor_id: actorId,
      force: true,
    })

    if (!result.sent) {
      return res.status(400).json({
        message: result.reason || "Could not send document email",
      })
    }

    return res.status(200).json({
      sent: true,
      recipient: result.recipient,
    })
  } catch (err: any) {
    return res.status(500).json({
      message:
        err instanceof Error ? err.message : "Failed to send document email",
    })
  }
}
