import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DOCUMENTS_MODULE } from "../types"
import DocumentsModuleService from "../modules/documents/service"

export type CreateSignatureRequestInput = {
  data: Record<string, unknown>
  document_id: string
  actor_id?: string | null
  audit_details?: Record<string, unknown>
}

const createSignatureRequestStep = createStep(
  "create-signature-request",
  async (input: CreateSignatureRequestInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const signatureRequest = await documentsService.createSignatureRequests(
      input.data as any
    )
    await documentsService.appendAuditLog(input.document_id, {
      event: "signature_requested",
      actor_id: input.actor_id ?? null,
      details: {
        signature_request_id: signatureRequest.id,
        ...(input.audit_details ?? {}),
      },
    })
    return new StepResponse(signatureRequest, signatureRequest.id)
  },
  async (signatureRequestId, { container }) => {
    if (!signatureRequestId) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    await documentsService.deleteSignatureRequests([signatureRequestId])
  }
)

export const createSignatureRequestWorkflow = createWorkflow(
  "create-signature-request",
  (input: CreateSignatureRequestInput) => {
    const signatureRequest = createSignatureRequestStep(input)
    return new WorkflowResponse(signatureRequest)
  }
)

export default createSignatureRequestWorkflow
