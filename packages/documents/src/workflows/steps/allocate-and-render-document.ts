import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import {
  DOCUMENTS_MODULE,
  type AllocateAndRenderDocumentInput,
  type AuditLogEntry,
  type DocumentRenderContext,
  type DocumentType,
  type PriorDocumentVersion,
} from "../../types"
import DocumentsModuleService from "../../modules/documents/service"
import { sanitizeFilename } from "../../modules/documents/utils/formatters"

export type { AllocateAndRenderDocumentInput } from "../../types"

export const allocateAndRenderDocumentStep = createStep(
  "allocate-and-render-document",
  async (input: AllocateAndRenderDocumentInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

    const documentType: DocumentType = input.document_type || "invoice"

    // 1. Check if an active generated document already exists (idempotency unless force_new_version or existing_document_id)
    if (!input.existing_document_id && !input.force_new_version) {
      const existingFilter: Record<string, unknown> = {
        order_id: input.order.id,
        document_type: documentType,
      }
      if (documentType === "packing_slip" && input.fulfillment?.id) {
        existingFilter.fulfillment_id = input.fulfillment.id
      }
      if (documentType === "credit_note" && input.refund?.id) {
        existingFilter.refund_id = input.refund.id
      }

      const existingDocs = await documentsService.listDocuments(existingFilter)
      const generatedDoc = existingDocs.find(
        (d: any) => d.status === "generated" && !d.is_stale
      )
      if (generatedDoc) {
        return new StepResponse(
          { document: generatedDoc, was_created: false },
          { created_document_id: null }
        )
      }
    }

    // 2. Resolve regional or global settings (Phase 4)
    const settingsRecord = await documentsService.resolveSettings(
      input.order.region_id
    )

    // 3. Resolve related document (e.g. original invoice for a credit note)
    let relatedDocumentInfo: DocumentRenderContext["related_document"] = null
    if (input.related_document_id) {
      const relDocs = await documentsService.listDocuments({
        id: input.related_document_id,
      })
      if (relDocs.length > 0) {
        relatedDocumentInfo = {
          id: relDocs[0].id,
          document_number: relDocs[0].document_number,
          document_type: relDocs[0].document_type,
          generated_at: relDocs[0].generated_at
            ? new Date(relDocs[0].generated_at).toISOString()
            : null,
        }
      }
    } else if (documentType === "credit_note") {
      const orderInvoices = await documentsService.listDocuments({
        order_id: input.order.id,
        document_type: "invoice",
        status: "generated",
      })
      if (orderInvoices.length > 0) {
        const origInv = orderInvoices[0]
        relatedDocumentInfo = {
          id: origInv.id,
          document_number: origInv.document_number,
          document_type: "invoice",
          generated_at: origInv.generated_at
            ? new Date(origInv.generated_at).toISOString()
            : null,
        }
      }
    }

    // 4. Determine document number and version
    let targetDoc: any = null
    if (input.existing_document_id) {
      const found = await documentsService.listDocuments({
        id: input.existing_document_id,
      })
      targetDoc = found[0] ?? null
    }

    let documentNumber: string
    let version = 1
    let priorVersions: PriorDocumentVersion[] = []
    let existingAuditLog: AuditLogEntry[] = []

    if (targetDoc) {
      documentNumber = targetDoc.document_number
      existingAuditLog = Array.isArray(targetDoc.audit_log)
        ? targetDoc.audit_log
        : []
      priorVersions = Array.isArray(targetDoc.prior_versions)
        ? targetDoc.prior_versions
        : []

      // If target document was already generated, issue a new version (v2, v3...) and archive previous PDF
      if (targetDoc.status === "generated") {
        priorVersions = [
          ...priorVersions,
          {
            version: Number(targetDoc.version || 1),
            document_number: targetDoc.document_number,
            file_id: targetDoc.file_id ?? null,
            file_url: targetDoc.file_url ?? null,
            file_size: targetDoc.file_size ?? null,
            generated_at: targetDoc.generated_at
              ? new Date(targetDoc.generated_at).toISOString()
              : null,
            reason: targetDoc.stale_reason || "Admin revision",
          },
        ]
        version = Number(targetDoc.version || 1) + 1
      } else {
        version = Number(targetDoc.version || 1)
      }
    } else {
      const allocated = await documentsService.allocateNextDocumentNumber(
        documentType,
        {
          regionId: input.order.region_id,
          orderDisplayId: input.order.display_id,
        }
      )
      documentNumber = allocated.documentNumber
    }

    const settingsSnapshot = await documentsService.buildSettingsSnapshot(
      settingsRecord,
      documentType,
      {
        localeOverride: input.locale,
        templateKeyOverride: input.template_id,
        b2bContext: input.b2b,
      }
    )

    const nowIso = new Date().toISOString()

    const renderContext: DocumentRenderContext = {
      document_number: documentNumber,
      document_type: documentType,
      version,
      generated_at: nowIso,
      locale: settingsSnapshot.locale,
      order: input.order,
      settings: settingsSnapshot,
      b2b: input.b2b,
      fulfillment: input.fulfillment ?? null,
      refund: input.refund
        ? {
            ...input.refund,
            reference_invoice_number:
              relatedDocumentInfo?.document_number ??
              input.refund.reference_invoice_number,
          }
        : null,
      related_document: relatedDocumentInfo,
    }

    // 5. Render PDF & Upload to Medusa File Module (Phase 0.4)
    try {
      const pdfBuffer = await documentsService.renderPdf(
        renderContext,
        settingsRecord.custom_translations
      )

      let fileId: string | null = null
      let fileUrl: string | null = null

      try {
        const fileModuleService = container.resolve(Modules.FILE) as any
        if (
          fileModuleService &&
          typeof fileModuleService.createFiles === "function"
        ) {
          const safeName = sanitizeFilename(
            `${documentType}-${documentNumber}-v${version}.pdf`
          )
          const uploaded = await fileModuleService.createFiles({
            filename: safeName,
            mimeType: "application/pdf",
            content: pdfBuffer.toString("base64"),
            access: "private",
          })
          const fileRecord = Array.isArray(uploaded) ? uploaded[0] : uploaded
          if (fileRecord) {
            fileId = fileRecord.id ?? null
            fileUrl = fileRecord.url ?? null
          }
        }
      } catch {
        // Fallback to inline base64 data URI when File Module provider is not configured
      }

      if (!fileUrl) {
        fileUrl = `data:application/pdf;base64,${pdfBuffer.toString("base64")}`
      }

      const auditEntry: AuditLogEntry = {
        timestamp: nowIso,
        event: targetDoc ? "regenerated" : "generated",
        actor_id: input.actor_id ?? null,
        details: {
          version,
          template_key: settingsSnapshot.template_key,
          locale: settingsSnapshot.locale,
          file_size: pdfBuffer.length,
        },
      }

      let savedDoc: any
      if (targetDoc) {
        savedDoc = await documentsService.updateDocuments({
          id: targetDoc.id,
          status: "generated",
          version,
          is_stale: false,
          stale_reason: null,
          template_id: settingsSnapshot.template_key,
          locale: settingsSnapshot.locale,
          file_id: fileId,
          file_url: fileUrl,
          file_size: pdfBuffer.length,
          settings_snapshot: settingsSnapshot as unknown as Record<
            string,
            unknown
          >,
          render_context_snapshot: renderContext as unknown as Record<
            string,
            unknown
          >,
          prior_versions: priorVersions as unknown as Record<string, unknown>,
          audit_log: [...existingAuditLog, auditEntry] as unknown as Record<
            string,
            unknown
          >,
          error_message: null,
          generated_at: new Date(nowIso),
        })
      } else {
        savedDoc = await documentsService.createDocuments({
          document_number: documentNumber,
          document_type: documentType,
          status: "generated",
          version: 1,
          is_stale: false,
          stale_reason: null,
          order_id: input.order.id,
          fulfillment_id: input.fulfillment?.id ?? null,
          refund_id: input.refund?.id ?? null,
          related_document_id: relatedDocumentInfo?.id ?? null,
          template_id: settingsSnapshot.template_key,
          locale: settingsSnapshot.locale,
          file_id: fileId,
          file_url: fileUrl,
          file_size: pdfBuffer.length,
          settings_snapshot: settingsSnapshot as unknown as Record<
            string,
            unknown
          >,
          render_context_snapshot: renderContext as unknown as Record<
            string,
            unknown
          >,
          prior_versions: [] as unknown as Record<string, unknown>,
          audit_log: [
            {
              timestamp: nowIso,
              event: "created",
              actor_id: input.actor_id ?? null,
            },
            auditEntry,
          ] as unknown as Record<string, unknown>,
          error_message: null,
          generated_at: new Date(nowIso),
          metadata: input.metadata ?? null,
        })
      }

      // 6. Emit "document.generated" event for Notification/Email subscriber (Phase 5)
      try {
        const eventBus = container.resolve(Modules.EVENT_BUS) as any
        if (eventBus && typeof eventBus.emit === "function") {
          await eventBus.emit({
            name: "document.generated",
            data: {
              id: savedDoc.id,
              document_id: savedDoc.id,
              document_number: savedDoc.document_number,
              document_type: savedDoc.document_type,
              order_id: savedDoc.order_id,
              version: savedDoc.version,
              region_id: input.order.region_id ?? null,
            },
          })
        }
      } catch {
        // Non-blocking if EventBus is unavailable in unit test environment
      }

      return new StepResponse(
        { document: savedDoc, was_created: !targetDoc },
        { created_document_id: targetDoc ? null : savedDoc.id }
      )
    } catch (renderError: any) {
      // Persist status="failed" so admins can inspect error_message and click Retry (Phase 8.3)
      const errorMessage =
        renderError instanceof Error
          ? renderError.message
          : String(renderError)

      const failedEntry: AuditLogEntry = {
        timestamp: nowIso,
        event: "failed",
        actor_id: input.actor_id ?? null,
        details: { error: errorMessage },
      }

      if (targetDoc) {
        await documentsService.updateDocuments({
          id: targetDoc.id,
          status: "failed",
          error_message: errorMessage,
          audit_log: [...existingAuditLog, failedEntry] as unknown as Record<
            string,
            unknown
          >,
        })
      } else {
        await documentsService.createDocuments({
          document_number: documentNumber,
          document_type: documentType,
          status: "failed",
          version: 1,
          order_id: input.order.id,
          fulfillment_id: input.fulfillment?.id ?? null,
          refund_id: input.refund?.id ?? null,
          related_document_id: relatedDocumentInfo?.id ?? null,
          template_id: settingsSnapshot.template_key,
          locale: settingsSnapshot.locale,
          settings_snapshot: settingsSnapshot as unknown as Record<
            string,
            unknown
          >,
          render_context_snapshot: renderContext as unknown as Record<
            string,
            unknown
          >,
          audit_log: [failedEntry] as unknown as Record<string, unknown>,
          error_message: errorMessage,
        })
      }

      throw renderError
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData?.created_document_id) return
    try {
      const documentsService =
        container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
      await documentsService.deleteDocuments([
        compensationData.created_document_id,
      ])
    } catch {
      // Ignore compensation cleanup errors
    }
  }
)
