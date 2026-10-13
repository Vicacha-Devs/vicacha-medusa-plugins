import type {
  AnalyticsSummary,
  DeleteCustomEntityResponse,
  DeleteSingleDocumentResponse,
  DocumentInspectResult,
  EntityConfigPayload,
  PlaygroundSearchPayload,
  SearchExecutionResult,
  SyncAllCollectionsResponse,
  SyncCollectionsPayload,
  SyncEntityCollectionResponse,
  SyncSingleDocumentResponse,
  TypesenseCollectionsResponse,
  TypesenseCurationsResponse,
  TypesenseEntitiesResponse,
  TypesenseHealthResponse,
  TypesenseMutationHookOptions,
  TypesenseQueryHookOptions,
  TypesenseStopwordsResponse,
  TypesenseSynonymsResponse,
  UpsertCurationPayload,
  UpsertEntityConfigResponse,
  UpsertStopwordsPayload,
  UpsertSynonymPayload,
} from "../types"
import { typesenseAdminSdk } from "../sdk/client"
import { typesenseQueryKeys } from "../sdk/query-keys"
import {
  useTypesenseMutation,
  useTypesenseQuery,
} from "./use-sdk-primitives"

export function useTypesenseHealth(
  options?: TypesenseQueryHookOptions<TypesenseHealthResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey = options?.queryKey ?? typesenseQueryKeys.health()
  return useTypesenseQuery<TypesenseHealthResponse>(
    queryKey,
    () => client.getHealth(),
    options
  )
}

export function useTypesenseCollections(
  options?: TypesenseQueryHookOptions<TypesenseCollectionsResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey = options?.queryKey ?? typesenseQueryKeys.collections()
  return useTypesenseQuery<TypesenseCollectionsResponse>(
    queryKey,
    () => client.listCollections(),
    options
  )
}

export function useSyncAllTypesenseCollections(
  options?: TypesenseMutationHookOptions<
    SyncAllCollectionsResponse,
    SyncCollectionsPayload | undefined
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    SyncAllCollectionsResponse,
    SyncCollectionsPayload | undefined
  >(
    (payload) => client.syncAllCollections(payload),
    options,
    typesenseQueryKeys.collections()
  )
}

export function useSyncTypesenseEntityCollection(
  options?: TypesenseMutationHookOptions<
    SyncEntityCollectionResponse,
    { entity: string; payload?: SyncCollectionsPayload }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    SyncEntityCollectionResponse,
    { entity: string; payload?: SyncCollectionsPayload }
  >(
    ({ entity, payload }) => client.syncEntityCollection(entity, payload),
    options,
    typesenseQueryKeys.collections()
  )
}

export function useTypesenseEntities(
  options?: TypesenseQueryHookOptions<TypesenseEntitiesResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey = options?.queryKey ?? typesenseQueryKeys.entities()
  return useTypesenseQuery<TypesenseEntitiesResponse>(
    queryKey,
    () => client.listEntities(),
    options
  )
}

export function useUpsertTypesenseEntityConfig(
  options?: TypesenseMutationHookOptions<
    UpsertEntityConfigResponse,
    Partial<EntityConfigPayload> & { entity_type: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    UpsertEntityConfigResponse,
    Partial<EntityConfigPayload> & { entity_type: string }
  >(
    (payload) => client.upsertEntityConfig(payload),
    options,
    typesenseQueryKeys.entities()
  )
}

export function useDeleteTypesenseCustomEntity(
  options?: TypesenseMutationHookOptions<
    DeleteCustomEntityResponse,
    { entity: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<DeleteCustomEntityResponse, { entity: string }>(
    ({ entity }) => client.deleteCustomEntity(entity),
    options,
    typesenseQueryKeys.entities()
  )
}

export function useTypesenseSynonyms(
  entity: string | undefined,
  options?: TypesenseQueryHookOptions<TypesenseSynonymsResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey =
    options?.queryKey ?? typesenseQueryKeys.synonyms(entity || "")
  return useTypesenseQuery<TypesenseSynonymsResponse>(
    queryKey,
    () => client.listSynonyms(entity!),
    {
      ...options,
      enabled: Boolean(entity) && (options?.enabled ?? true),
    }
  )
}

export function useUpsertTypesenseSynonym(
  options?: TypesenseMutationHookOptions<
    Record<string, any>,
    { entity: string; payload: UpsertSynonymPayload }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    Record<string, any>,
    { entity: string; payload: UpsertSynonymPayload }
  >(
    ({ entity, payload }) => client.upsertSynonym(entity, payload),
    options,
    typesenseQueryKeys.synonymsAll()
  )
}

export function useDeleteTypesenseSynonym(
  options?: TypesenseMutationHookOptions<
    { deleted?: boolean },
    { entity: string; id: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    { deleted?: boolean },
    { entity: string; id: string }
  >(
    ({ entity, id }) => client.deleteSynonym(entity, id),
    options,
    typesenseQueryKeys.synonymsAll()
  )
}

export function useTypesenseCurations(
  entity: string | undefined,
  options?: TypesenseQueryHookOptions<TypesenseCurationsResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey =
    options?.queryKey ?? typesenseQueryKeys.curations(entity || "")
  return useTypesenseQuery<TypesenseCurationsResponse>(
    queryKey,
    () => client.listCurations(entity!),
    {
      ...options,
      enabled: Boolean(entity) && (options?.enabled ?? true),
    }
  )
}

export function useUpsertTypesenseCuration(
  options?: TypesenseMutationHookOptions<
    Record<string, any>,
    { entity: string; payload: UpsertCurationPayload }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    Record<string, any>,
    { entity: string; payload: UpsertCurationPayload }
  >(
    ({ entity, payload }) => client.upsertCuration(entity, payload),
    options,
    typesenseQueryKeys.curationsAll()
  )
}

export function useDeleteTypesenseCuration(
  options?: TypesenseMutationHookOptions<
    { deleted?: boolean },
    { entity: string; id: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    { deleted?: boolean },
    { entity: string; id: string }
  >(
    ({ entity, id }) => client.deleteCuration(entity, id),
    options,
    typesenseQueryKeys.curationsAll()
  )
}

export function useTypesenseStopwords(
  options?: TypesenseQueryHookOptions<TypesenseStopwordsResponse>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey = options?.queryKey ?? typesenseQueryKeys.stopwords()
  return useTypesenseQuery<TypesenseStopwordsResponse>(
    queryKey,
    () => client.listStopwords(),
    options
  )
}

export function useUpsertTypesenseStopwords(
  options?: TypesenseMutationHookOptions<
    Record<string, any>,
    UpsertStopwordsPayload
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<Record<string, any>, UpsertStopwordsPayload>(
    (payload) => client.upsertStopwords(payload),
    options,
    typesenseQueryKeys.stopwords()
  )
}

export function useDeleteTypesenseStopwords(
  options?: TypesenseMutationHookOptions<{ deleted?: boolean }, { id: string }>
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<{ deleted?: boolean }, { id: string }>(
    ({ id }) => client.deleteStopwords(id),
    options,
    typesenseQueryKeys.stopwords()
  )
}

export function useTypesensePlaygroundSearch(
  options?: TypesenseMutationHookOptions<
    SearchExecutionResult,
    PlaygroundSearchPayload
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<SearchExecutionResult, PlaygroundSearchPayload>(
    (payload) => client.runPlaygroundSearch(payload),
    options,
    typesenseQueryKeys.analytics()
  )
}

export function useTypesenseAnalytics(
  options?: TypesenseQueryHookOptions<AnalyticsSummary>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey = options?.queryKey ?? typesenseQueryKeys.analytics()
  return useTypesenseQuery<AnalyticsSummary>(
    queryKey,
    () => client.getAnalytics(),
    options
  )
}

export function useTypesenseDocumentInspector(
  entity: string | undefined,
  id: string | undefined,
  options?: TypesenseQueryHookOptions<DocumentInspectResult>
) {
  const client = options?.client ?? typesenseAdminSdk
  const queryKey =
    options?.queryKey ?? typesenseQueryKeys.document(entity || "", id || "")
  return useTypesenseQuery<DocumentInspectResult>(
    queryKey,
    () => client.inspectDocument(entity!, id!),
    {
      ...options,
      enabled: Boolean(entity && id) && (options?.enabled ?? true),
    }
  )
}

export function useSyncTypesenseDocument(
  options?: TypesenseMutationHookOptions<
    SyncSingleDocumentResponse,
    { entity: string; id: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    SyncSingleDocumentResponse,
    { entity: string; id: string }
  >(
    ({ entity, id }) => client.syncDocument(entity, id),
    options,
    typesenseQueryKeys.documentsAll()
  )
}

export function useDeleteTypesenseDocument(
  options?: TypesenseMutationHookOptions<
    DeleteSingleDocumentResponse,
    { entity: string; id: string }
  >
) {
  const client = options?.client ?? typesenseAdminSdk
  return useTypesenseMutation<
    DeleteSingleDocumentResponse,
    { entity: string; id: string }
  >(
    ({ entity, id }) => client.deleteDocument(entity, id),
    options,
    typesenseQueryKeys.documentsAll()
  )
}
