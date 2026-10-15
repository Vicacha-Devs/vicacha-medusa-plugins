import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import DocumentsModuleService from "../modules/documents/service"
import { DOCUMENTS_MODULE } from "../types"

export type UpdateDocumentTemplateInput = {
  id: string
  data: Record<string, unknown>
}

const updateDocumentTemplateStep = createStep(
  "update-document-template",
  async (input: UpdateDocumentTemplateInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)

    const [previous] = await documentsService.listDocumentTemplates({
      id: input.id,
    })
    const updated = await documentsService.updateDocumentTemplates({
      id: input.id,
      ...input.data,
    })
    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    await documentsService.updateDocumentTemplates(previous as any)
  }
)

export const updateDocumentTemplateWorkflow = createWorkflow(
  "update-document-template",
  (input: UpdateDocumentTemplateInput) => {
    const template = updateDocumentTemplateStep(input)
    return new WorkflowResponse(template)
  }
)

export default updateDocumentTemplateWorkflow
