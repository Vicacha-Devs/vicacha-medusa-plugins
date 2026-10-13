import type {
  FederatedSearchResult,
  SearchExecutionResult,
  StoreAnalyticsEventPayload,
  StoreAnalyticsEventResponse,
  StoreConversationalChatPayload,
  StoreConversationalChatResponse,
  StoreFederatedSearchPayload,
  StoreScopedTokenParams,
  StoreScopedTokenResponse,
  StoreSearchQueryParams,
  TypesenseMutationHookOptions,
  TypesenseQueryHookOptions,
} from "../types"
import { typesenseStoreSdk } from "../sdk/client"
import { typesenseQueryKeys } from "../sdk/query-keys"
import {
  useTypesenseMutation,
  useTypesenseQuery,
} from "./use-sdk-primitives"

export function useTypesenseSearch<T = Record<string, any>>(
  params: StoreSearchQueryParams,
  options?: TypesenseQueryHookOptions<SearchExecutionResult<T>>
) {
  const client = options?.client ?? typesenseStoreSdk
  const queryKey =
    options?.queryKey ??
    typesenseQueryKeys.storeSearch(params as Record<string, unknown>)

  return useTypesenseQuery<SearchExecutionResult<T>>(
    queryKey,
    () => client.search<T>(params),
    options
  )
}

export function useTypesenseFederatedSearch(
  options?: TypesenseMutationHookOptions<
    FederatedSearchResult,
    StoreFederatedSearchPayload
  >
) {
  const client = options?.client ?? typesenseStoreSdk
  return useTypesenseMutation<
    FederatedSearchResult,
    StoreFederatedSearchPayload
  >(
    (payload) => client.federatedSearch(payload),
    options,
    typesenseQueryKeys.storeSearches()
  )
}

export function useTypesenseProductsSearch<T = Record<string, any>>(
  params?: Omit<StoreSearchQueryParams, "entity">,
  options?: TypesenseQueryHookOptions<SearchExecutionResult<T>>
) {
  const client = options?.client ?? typesenseStoreSdk
  const queryKey =
    options?.queryKey ??
    typesenseQueryKeys.storeSearch({
      entity: "product",
      ...(params || {}),
    } as Record<string, unknown>)

  return useTypesenseQuery<SearchExecutionResult<T>>(
    queryKey,
    () => client.searchProducts<T>(params),
    options
  )
}

export function useTypesenseCategoriesSearch<T = Record<string, any>>(
  params?: Omit<StoreSearchQueryParams, "entity">,
  options?: TypesenseQueryHookOptions<SearchExecutionResult<T>>
) {
  const client = options?.client ?? typesenseStoreSdk
  const queryKey =
    options?.queryKey ??
    typesenseQueryKeys.storeSearch({
      entity: "product_category",
      ...(params || {}),
    } as Record<string, unknown>)

  return useTypesenseQuery<SearchExecutionResult<T>>(
    queryKey,
    () => client.searchCategories<T>(params),
    options
  )
}

export function useTypesenseCollectionsSearch<T = Record<string, any>>(
  params?: Omit<StoreSearchQueryParams, "entity">,
  options?: TypesenseQueryHookOptions<SearchExecutionResult<T>>
) {
  const client = options?.client ?? typesenseStoreSdk
  const queryKey =
    options?.queryKey ??
    typesenseQueryKeys.storeSearch({
      entity: "product_collection",
      ...(params || {}),
    } as Record<string, unknown>)

  return useTypesenseQuery<SearchExecutionResult<T>>(
    queryKey,
    () => client.searchCollections<T>(params),
    options
  )
}

export function useTypesenseScopedToken(
  params?: StoreScopedTokenParams,
  options?: TypesenseQueryHookOptions<StoreScopedTokenResponse>
) {
  const client = options?.client ?? typesenseStoreSdk
  const queryKey =
    options?.queryKey ??
    typesenseQueryKeys.scopedToken(params as Record<string, unknown> | undefined)

  return useTypesenseQuery<StoreScopedTokenResponse>(
    queryKey,
    () => client.getScopedSearchToken(params),
    options
  )
}

export function useTypesenseConversationalChat(
  options?: TypesenseMutationHookOptions<
    StoreConversationalChatResponse,
    StoreConversationalChatPayload
  >
) {
  const client = options?.client ?? typesenseStoreSdk
  return useTypesenseMutation<
    StoreConversationalChatResponse,
    StoreConversationalChatPayload
  >(
    (payload) => client.conversationalChat(payload),
    options,
    typesenseQueryKeys.storeSearches()
  )
}

export function useTrackTypesenseAnalytics(
  options?: TypesenseMutationHookOptions<
    StoreAnalyticsEventResponse,
    StoreAnalyticsEventPayload
  >
) {
  const client = options?.client ?? typesenseStoreSdk
  return useTypesenseMutation<
    StoreAnalyticsEventResponse,
    StoreAnalyticsEventPayload
  >(
    (payload) => client.trackAnalyticsEvent(payload),
    options,
    typesenseQueryKeys.analytics()
  )
}
