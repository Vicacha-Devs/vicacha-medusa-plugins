import type {
  DocumentsQueryHookOptions,
  GetDocumentResponse,
  ListDocumentsParams,
  ListDocumentsResponse,
  StoreOrderDocumentsResponse,
  StoreOrderSigningUrlResponse,
} from "../types"
import { documentsAdminSdk, documentsStoreSdk } from "../sdk/client"
import { documentsQueryKeys } from "../sdk/query-keys"
import { useDocumentsQuery } from "./use-sdk-primitives"

export function useDocumentsList(
  params?: ListDocumentsParams,
  options?: DocumentsQueryHookOptions<ListDocumentsResponse>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey =
    options?.queryKey ??
    documentsQueryKeys.list(params as Record<string, unknown> | undefined)

  return useDocumentsQuery<ListDocumentsResponse>(
    queryKey,
    () => client.listDocuments(params),
    options
  )
}

export function useOrderDocuments(
  orderId: string | undefined,
  options?: DocumentsQueryHookOptions<ListDocumentsResponse>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey =
    options?.queryKey ?? documentsQueryKeys.order(orderId || "")

  return useDocumentsQuery<ListDocumentsResponse>(
    queryKey,
    () => client.listDocuments({ order_id: orderId!, limit: 50 }),
    {
      ...options,
      enabled: Boolean(orderId) && (options?.enabled ?? true),
    }
  )
}

export function useDocumentDetail(
  id: string | undefined,
  options?: DocumentsQueryHookOptions<GetDocumentResponse>
) {
  const client = options?.client ?? documentsAdminSdk
  const queryKey = options?.queryKey ?? documentsQueryKeys.detail(id || "")

  return useDocumentsQuery<GetDocumentResponse>(
    queryKey,
    () => client.getDocument(id!),
    {
      ...options,
      enabled: Boolean(id) && (options?.enabled ?? true),
    }
  )
}

export function useStoreOrderDocuments(
  orderId: string | undefined,
  options?: DocumentsQueryHookOptions<StoreOrderDocumentsResponse>
) {
  const client = options?.client ?? documentsStoreSdk
  const queryKey =
    options?.queryKey ?? documentsQueryKeys.order(orderId || "")

  return useDocumentsQuery<StoreOrderDocumentsResponse>(
    queryKey,
    () => client.listOrderDocuments(orderId!),
    {
      ...options,
      enabled: Boolean(orderId) && (options?.enabled ?? true),
    }
  )
}

export function useStoreOrderSigningUrl(
  orderId: string | undefined,
  options?: DocumentsQueryHookOptions<StoreOrderSigningUrlResponse>
) {
  const client = options?.client ?? documentsStoreSdk
  const queryKey =
    options?.queryKey ?? documentsQueryKeys.orderSigningUrl(orderId || "")

  return useDocumentsQuery<StoreOrderSigningUrlResponse>(
    queryKey,
    () => client.getOrderSigningUrl(orderId!),
    {
      ...options,
      enabled: Boolean(orderId) && (options?.enabled ?? true),
    }
  )
}
