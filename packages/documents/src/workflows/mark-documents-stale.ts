import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import DocumentsModuleService from "../modules/documents/service"
import {
  DOCUMENTS_MODULE,
  type MarkDocumentsStaleInput,
} from "../types"

const markDocumentsStaleStep = createStep(
  "mark-documents-stale",
  async (input: MarkDocumentsStaleInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const updatedCount = await documentsService.markOrderDocumentsStale(
      input.order_id,
      input.reason
    )
    return new StepResponse({ updated_count: updatedCount })
  }
)

export const markDocumentsStaleWorkflow = createWorkflow(
  "mark-documents-stale",
  (input: MarkDocumentsStaleInput) => {
    const res = markDocumentsStaleStep(input)
    return new WorkflowResponse(res)
  }
)

export default markDocumentsStaleWorkflow
