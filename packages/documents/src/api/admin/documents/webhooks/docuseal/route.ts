import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { DOCUMENTS_MODULE } from "../../../../../modules/documents/types"
import DocumentsModuleService from "../../../../../modules/documents/service"
import { sanitizeFilename } from "../../../../../modules/documents/utils/formatters"
import { updateSignatureRequestWorkflow } from "../../../../../workflows/update-signature-request"

/**
 * POST /admin/documents/webhooks/docuseal (Phase 6.4)
 * HMAC-verified webhook handler for Docuseal events:
 * - `form.viewed` / `submission.viewed` -> status = "opened"
 * - `form.completed` / `submission.completed` -> status = "completed", downloads signed PDF & uploads to File Module
 * - `form.declined` / `submission.declined` -> status = "declined"
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const documentsService =
    req.scope.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

  const signatureHeader =
    (req.headers["x-docuseal-signature"] as string | undefined) ||
    (req.headers["X-Docuseal-Signature"] as string | undefined)

  const rawBody =
    (req as any).rawBody ||
    (typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body || {}))

  if (!documentsService.docuseal.hasWebhookSecret()) {
    return res.status(401).json({
      message: "Docuseal webhook secret is not configured",
    })
  }

  const isValid = documentsService.docuseal.verifyWebhookSignature(
    rawBody,
    signatureHeader
  )
  if (!isValid) {
    return res.status(401).json({
      message: "Invalid X-Docuseal-Signature header",
    })
  }

  const payload = (
    typeof req.body === "string" ? JSON.parse(req.body) : req.body || {}
  ) as {
    event_type?: string
    data?: Record<string, any>
  }

  const eventType = (payload.event_type || "").toLowerCase()
  const data = payload.data || {}
  const submissionId = Number(
    data.submission_id ?? data.submission?.id ?? data.id ?? 0
  )

  if (!submissionId) {
    return res.status(200).json({ received: true, ignored: true })
  }

  const matchingReqs = await documentsService.listSignatureRequests({
    docuseal_submission_id: submissionId,
  })

  if (matchingReqs.length === 0) {
    return res.status(200).json({ received: true, matched: false })
  }

  const sigReq = matchingReqs[0]
  const now = new Date()

  if (eventType.includes("viewed") || eventType.includes("opened")) {
    await updateSignatureRequestWorkflow(req.scope).run({
      input: {
        id: sigReq.id,
        document_id: sigReq.document_id,
        data: {
          status: "opened",
          opened_at: now,
          raw_webhook_payload: payload as unknown as Record<string, unknown>,
        },
        audit_event: "signature_opened",
        audit_details: { submission_id: submissionId },
      },
    })
  } else if (eventType.includes("completed")) {
    let signedFileId: string | null = null
    let signedFileUrl: string | null = null

    const docUrls: Array<{ url?: string }> = Array.isArray(data.documents)
      ? data.documents
      : Array.isArray(data.submission?.documents)
        ? data.submission.documents
        : []
    const remoteSignedUrl = docUrls[0]?.url

    if (remoteSignedUrl) {
      try {
        const signedPdfBuffer =
          await documentsService.docuseal.downloadSignedPdf(remoteSignedUrl)

        try {
          const fileModuleService = req.scope.resolve(Modules.FILE) as any
          if (
            fileModuleService &&
            typeof fileModuleService.createFiles === "function"
          ) {
            const uploaded = await fileModuleService.createFiles({
              filename: sanitizeFilename(
                `signed-${sigReq.document_id}-${submissionId}.pdf`
              ),
              mimeType: "application/pdf",
              content: signedPdfBuffer.toString("base64"),
              access: "private",
            })
            const fileRecord = Array.isArray(uploaded) ? uploaded[0] : uploaded
            signedFileId = fileRecord?.id ?? null
            signedFileUrl = fileRecord?.url ?? null
          }
        } catch {
          // Fall back to base64 data URI if File Module is not configured
        }

        if (!signedFileUrl) {
          signedFileUrl = `data:application/pdf;base64,${signedPdfBuffer.toString("base64")}`
        }
      } catch {
        // Keep remote URL metadata in raw_webhook_payload if download fails
      }
    }

    await updateSignatureRequestWorkflow(req.scope).run({
      input: {
        id: sigReq.id,
        document_id: sigReq.document_id,
        data: {
          status: "completed",
          completed_at: now,
          signed_file_id: signedFileId,
          signed_file_url: signedFileUrl,
          audit_log_url:
            typeof data.audit_log_url === "string" ? data.audit_log_url : null,
          raw_webhook_payload: payload as unknown as Record<string, unknown>,
        },
        audit_event: "signature_completed",
        audit_details: {
          submission_id: submissionId,
          signed_file_id: signedFileId,
        },
      },
    })
  } else if (eventType.includes("declined")) {
    const declineReason =
      typeof data.decline_reason === "string"
        ? data.decline_reason
        : "Declined by signer"

    await updateSignatureRequestWorkflow(req.scope).run({
      input: {
        id: sigReq.id,
        document_id: sigReq.document_id,
        data: {
          status: "declined",
          declined_at: now,
          decline_reason: declineReason,
          raw_webhook_payload: payload as unknown as Record<string, unknown>,
        },
        audit_event: "signature_declined",
        audit_details: {
          submission_id: submissionId,
          reason: declineReason,
        },
      },
    })
  }

  return res.status(200).json({ received: true, matched: true })
}
