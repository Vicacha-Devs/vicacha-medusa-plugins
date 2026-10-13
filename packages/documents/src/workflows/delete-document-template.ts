import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { DOCUMENTS_MODULE } from "../types"
import DocumentsModuleService from "../modules/documents/service"

export type DeleteDocumentTemplateInput = { id: string }

const deleteDocumentTemplateStep = createStep(
  "delete-document-template",
  async (input: DeleteDocumentTemplateInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

    const [previous] = await documentsService.listDocumentTemplates({
      id: input.id,
    })
    await documentsService.deleteDocumentTemplates([input.id])
    return new StepResponse({ id: input.id }, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const { created_at, updated_at, deleted_at, ...rest } = previous as any
    await documentsService.createDocumentTemplates(rest)
  }
)

export const deleteDocumentTemplateWorkflow = createWorkflow(
  "delete-document-template",
  (input: DeleteDocumentTemplateInput) => {
    const res = deleteDocumentTemplateStep(input)
    return new WorkflowResponse(res)
  }
)

export default deleteDocumentTemplateWorkflow
