import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import type { GenerateDocumentWorkflowInput } from "../types"
import { fetchOrderContextStep } from "./steps/fetch-order-context"
import { allocateAndRenderDocumentStep } from "./steps/allocate-and-render-document"

export type { GenerateDocumentWorkflowInput } from "../types"

export const generateDocumentWorkflow = createWorkflow(
  "generate-document",
  (input: GenerateDocumentWorkflowInput) => {
    const orderContext = fetchOrderContextStep({
      order_id: input.order_id,
      fulfillment_id: input.fulfillment_id,
      refund_id: input.refund_id,
      refund_amount: input.refund_amount,
      refund_reason: input.refund_reason,
    })

    const documentType = transform(
      { input },
      (data) => data.input.document_type ?? "invoice"
    )

    const result = allocateAndRenderDocumentStep({
      order: orderContext.order,
      b2b: orderContext.b2b,
      fulfillment: orderContext.fulfillment,
      refund: orderContext.refund,
      document_type: documentType,
      template_id: input.template_id,
      locale: input.locale,
      related_document_id: input.related_document_id,
      existing_document_id: input.existing_document_id,
      force_new_version: input.force_new_version,
      actor_id: input.actor_id,
      metadata: input.metadata,
    })

    return new WorkflowResponse(result)
  }
)

export default generateDocumentWorkflow
