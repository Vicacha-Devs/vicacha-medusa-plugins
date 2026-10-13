import type {
  BulkDownloadPayload,
  BulkGenerateDocumentsPayload,
  BulkGenerateDocumentsResponse,
  DeleteDocumentResponse,
  DocumentsMutationHookOptions,
  GenerateDocumentPayload,
  GenerateDocumentResponse,
  RegenerateDocumentPayload,
  SendDocumentEmailPayload,
  SendDocumentEmailResponse,
  SendDocumentForSignaturePayload,
  SendDocumentForSignatureResponse,
} from "../types"
import { documentsAdminSdk } from "../sdk/client"
import { documentsQueryKeys } from "../sdk/query-keys"
import { useDocumentsMutation } from "./use-sdk-primitives"

export function useGenerateDocument(
  options?: DocumentsMutationHookOptions<
    GenerateDocumentResponse,
    GenerateDocumentPayload
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<GenerateDocumentResponse, GenerateDocumentPayload>(
    (payload) => client.generateDocument(payload),
    options,
    documentsQueryKeys.all
  )
}

export function useRegenerateDocument(
  options?: DocumentsMutationHookOptions<
    GenerateDocumentResponse,
    { id: string; payload?: RegenerateDocumentPayload }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    GenerateDocumentResponse,
    { id: string; payload?: RegenerateDocumentPayload }
  >(
    ({ id, payload }) => client.regenerateDocument(id, payload),
    options,
    documentsQueryKeys.all
  )
}

export function useDeleteDocument(
  options?: DocumentsMutationHookOptions<DeleteDocumentResponse, { id: string }>
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<DeleteDocumentResponse, { id: string }>(
    ({ id }) => client.deleteDocument(id),
    options,
    documentsQueryKeys.all
  )
}

export function useSendDocumentEmail(
  options?: DocumentsMutationHookOptions<
    SendDocumentEmailResponse,
    { id: string; payload?: SendDocumentEmailPayload }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    SendDocumentEmailResponse,
    { id: string; payload?: SendDocumentEmailPayload }
  >(
    ({ id, payload }) => client.sendDocumentEmail(id, payload),
    options,
    documentsQueryKeys.all
  )
}

export function useSendDocumentForSignature(
  options?: DocumentsMutationHookOptions<
    SendDocumentForSignatureResponse,
    { id: string; payload?: SendDocumentForSignaturePayload }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    SendDocumentForSignatureResponse,
    { id: string; payload?: SendDocumentForSignaturePayload }
  >(
    ({ id, payload }) => client.sendDocumentForSignature(id, payload),
    options,
    documentsQueryKeys.all
  )
}

export function useBulkGenerateDocuments(
  options?: DocumentsMutationHookOptions<
    BulkGenerateDocumentsResponse,
    BulkGenerateDocumentsPayload
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    BulkGenerateDocumentsResponse,
    BulkGenerateDocumentsPayload
  >(
    (payload) => client.bulkGenerateDocuments(payload),
    options,
    documentsQueryKeys.all
  )
}

export function useBulkDownloadDocuments(
  options?: DocumentsMutationHookOptions<Blob, BulkDownloadPayload>
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<Blob, BulkDownloadPayload>(
    (payload) => client.bulkDownloadZip(payload),
    options,
    documentsQueryKeys.all
  )
}
