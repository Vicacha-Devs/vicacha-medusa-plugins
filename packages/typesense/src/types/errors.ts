import type { MappedTypesenseError } from "./index"

export const TYPESENSE_ERROR_MAP: Record<string, MappedTypesenseError> = {
  CLUSTER_UNREACHABLE: {
    code: "cluster_unreachable",
    message:
      "Typesense cluster is unreachable or the circuit breaker is open.",
    retryable: true,
  },
  COLLECTION_NOT_FOUND: {
    code: "collection_not_found",
    message: "The requested Typesense collection or alias does not exist.",
    retryable: false,
  },
  DOCUMENT_NOT_FOUND: {
    code: "document_not_found",
    message: "The requested document was not found in the Typesense index.",
    retryable: false,
  },
  SCOPED_KEY_GENERATION_FAILED: {
    code: "scoped_key_generation_failed",
    message: "Failed to generate a scoped storefront search API key.",
    retryable: false,
  },
  SYNC_FAILED: {
    code: "sync_failed",
    message: "Failed to synchronize catalog records with Typesense.",
    retryable: true,
  },
}
