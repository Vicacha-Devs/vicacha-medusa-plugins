import type {
  DeleteDocumentTemplateResponse,
  DocumentsMutationHookOptions,
  DocumentsQueryHookOptions,
  GetDocumentTemplateResponse,
  ListDocumentTemplatesParams,
  ListDocumentTemplatesResponse,
  UpsertDocumentTemplatePayload,
} from "../types"
import { documentsAdminSdk } from "../sdk/client"
import { documentsQueryKeys } from "../sdk/query-keys"
import {
  useDocumentsMutation,
  useDocumentsQuery,
} from "./use-sdk-primitives"

export function useDocumentTemplates(
  params?: ListDocumentTemplatesParams,
  options?: DocumentsQueryHookOptions<ListDocumentTemplatesResponse>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey =
    options?.queryKey ??
    documentsQueryKeys.templates(params as Record<string, unknown> | undefined)

  return useDocumentsQuery<ListDocumentTemplatesResponse>(
    queryKey,
    () => client.listTemplates(params),
    options
  )
}

export function useSaveDocumentTemplate(
  options?: DocumentsMutationHookOptions<
    GetDocumentTemplateResponse,
    { id?: string; payload: UpsertDocumentTemplatePayload }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<
    GetDocumentTemplateResponse,
    { id?: string; payload: UpsertDocumentTemplatePayload }
  >(
    ({ id, payload }) =>
      id
        ? client.updateTemplate(id, payload)
        : client.createTemplate(payload),
    options,
    documentsQueryKeys.templatesAll()
  )
}

export function useDeleteDocumentTemplate(
  options?: DocumentsMutationHookOptions<
    DeleteDocumentTemplateResponse,
    { id: string }
  >
) {
  const client = options?.client ?? documentsAdminSdk
  return useDocumentsMutation<DeleteDocumentTemplateResponse, { id: string }>(
    ({ id }) => client.deleteTemplate(id),
    options,
    documentsQueryKeys.templatesAll()
  )
}
