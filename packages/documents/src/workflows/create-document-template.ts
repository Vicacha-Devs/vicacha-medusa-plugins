import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"

import DocumentsModuleService from "../modules/documents/service"
import { DOCUMENTS_MODULE } from "../types"

export type CreateDocumentTemplateInput = {
  data: Record<string, unknown>
}

const createDocumentTemplateStep = createStep(
  "create-document-template",
  async (input: CreateDocumentTemplateInput, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const template = await documentsService.createDocumentTemplates(
      input.data as any
    )
    return new StepResponse(template, template.id)
  },
  async (templateId, { container }) => {
    if (!templateId) return
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    await documentsService.deleteDocumentTemplates([templateId])
  }
)

export const createDocumentTemplateWorkflow = createWorkflow(
  "create-document-template",
  (input: CreateDocumentTemplateInput) => {
    const template = createDocumentTemplateStep(input)
    return new WorkflowResponse(template)
  }
)

export default createDocumentTemplateWorkflow
