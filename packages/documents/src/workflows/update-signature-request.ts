import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import DocumentsModuleService from "../modules/documents/service"
import { DOCUMENTS_MODULE, type AuditLogEntry } from "../types"

export type UpdateSignatureRequestInput = {
  id: string
  data: Record<string, unknown>
  document_id: string
  audit_event: AuditLogEntry["event"]
  audit_details?: Record<string, unknown>
}

const updateSignatureRequestStep = createStep(
  "update-signature-request",
  async (input: UpdateSignatureRequestInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const [previous] = await documentsService.listSignatureRequests({
      id: input.id,
    })
    const updated = await documentsService.updateSignatureRequests({
      id: input.id,
      ...input.data,
    })
    await documentsService.appendAuditLog(input.document_id, {
      event: input.audit_event,
      details: input.audit_details ?? {},
    })
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    await documentsService.updateSignatureRequests(previous as any)
  }
)

export const updateSignatureRequestWorkflow = createWorkflow(
  "update-signature-request",
  (input: UpdateSignatureRequestInput) => {
    const updated = updateSignatureRequestStep(input)
    return new WorkflowResponse(updated)
  }
)

export default updateSignatureRequestWorkflow
