import type { MappedDocumentError } from "./index"

export const DOCUMENTS_ERROR_MAP: Record<string, MappedDocumentError> = {
  DOCUMENT_NOT_FOUND: {
    code: "document_not_found",
    message: "The requested document could not be found.",
    retryable: false,
  },
  ORDER_NOT_FOUND: {
    code: "order_not_found",
    message: "The target order for document generation could not be found.",
    retryable: false,
  },
  PDF_RENDER_FAILED: {
    code: "pdf_render_failed",
    message: "Failed to render the PDF document from the selected template.",
    retryable: true,
  },
  DOCUSEAL_NOT_CONFIGURED: {
    code: "docuseal_not_configured",
    message: "DocuSeal e-signature integration is not configured.",
    retryable: false,
  },
  SIGNATURE_SUBMISSION_FAILED: {
    code: "signature_submission_failed",
    message: "Failed to submit the document for e-signature.",
    retryable: true,
  },
  EMAIL_DISPATCH_FAILED: {
    code: "email_dispatch_failed",
    message: "Failed to dispatch the document email via notification provider.",
    retryable: true,
  },
}
