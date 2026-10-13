import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  DOCUMENTS_MODULE,
  type RegenerateDocumentRevisionInput,
} from "../types"
import DocumentsModuleService from "../modules/documents/service"
import { generateDocumentWorkflow } from "./generate-document"

export type { RegenerateDocumentRevisionInput } from "../types"

const lookupExistingDocumentStep = createStep(
  "lookup-existing-document",
  async (input: { document_id: string }, { container }) => {
    const documentsService =
      container.resolve<DocumentsModuleService>(DOCUMENTS_MODULE)
    const docs = await documentsService.listDocuments({ id: input.document_id })
    if (docs.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Document ${input.document_id} not found`
      )
    }
    return new StepResponse(docs[0])
  }
)

export const regenerateDocumentRevisionWorkflow = createWorkflow(
  "regenerate-document-revision",
  (input: RegenerateDocumentRevisionInput) => {
    const existingDoc = lookupExistingDocumentStep({
      document_id: input.document_id,
    })

    const overrides = transform({ input, existingDoc }, (data) => ({
      template_id: data.input.template_id ?? data.existingDoc.template_id,
      locale: data.input.locale ?? data.existingDoc.locale,
    }))

    const result = generateDocumentWorkflow.runAsStep({
      input: {
        order_id: existingDoc.order_id,
        document_type: existingDoc.document_type,
        fulfillment_id: existingDoc.fulfillment_id,
        refund_id: existingDoc.refund_id,
        related_document_id: existingDoc.related_document_id,
        existing_document_id: existingDoc.id,
        template_id: overrides.template_id,
        locale: overrides.locale,
        force_new_version: true,
        actor_id: input.actor_id,
      },
    })

    return new WorkflowResponse(result)
  }
)

export default regenerateDocumentRevisionWorkflow
