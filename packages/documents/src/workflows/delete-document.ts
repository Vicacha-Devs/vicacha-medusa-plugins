import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DOCUMENTS_MODULE } from "../types"
import DocumentsModuleService from "../modules/documents/service"

export type DeleteDocumentInput = { id: string }

const deleteDocumentStep = createStep(
  "delete-document",
  async (input: DeleteDocumentInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const [previous] = await documentsService.listDocuments({ id: input.id })
    await documentsService.deleteDocuments([input.id])
    return new StepResponse({ id: input.id }, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const { created_at, updated_at, deleted_at, ...rest } = previous as any
    await documentsService.createDocuments(rest)
  }
)

export const deleteDocumentWorkflow = createWorkflow(
  "delete-document",
  (input: DeleteDocumentInput) => {
    const res = deleteDocumentStep(input)
    return new WorkflowResponse(res)
  }
)

export default deleteDocumentWorkflow
