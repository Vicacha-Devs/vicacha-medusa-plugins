import { AdminStoreParams, AdminStoreResponse, AdminUpdateStore, SelectParams } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import {
  MutationOptions,
  QueryKey,
  UseQueryOptions,
  UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { queryKeysFactory } from "../../lib/query-key-factory"
import { pricePreferencesQueryKeys } from "./use-price-preferences"
import { sdk } from "../../lib"


const STORE_QUERY_KEY = "store" as const
export const storeQueryKeys = queryKeysFactory(STORE_QUERY_KEY)


interface RetrieveActiveStoreProps {
  query?: AdminStoreParams
}
/**
 * Workaround to keep the V1 version of retrieving the store.
 */
export async function retrieveActiveStore({
  query
} : RetrieveActiveStoreProps): Promise<AdminStoreResponse> {
  const response = await sdk.admin.store.list(query)

  const activeStore = response.stores?.[0]

  if (!activeStore) {
    throw new FetchError("No active store found", "Not Found", 404)
  }

  return { store: activeStore }
}

interface UseStoreProps {
  query?: SelectParams,
  options?: Omit<
    UseQueryOptions<
      AdminStoreResponse,
      FetchError,
      AdminStoreResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
}

export const useStore = ({
  query,
  options
}: UseStoreProps) => {
  const { data, ...rest } = useQuery({
    queryFn: () => retrieveActiveStore({ query}),
    queryKey: storeQueryKeys.details(),
    ...options,
  })

  return {
    ...data,
    ...rest,
  }
}

interface UseUpdateStoreProps {
  id: string,
  options?: MutationOptions<
    AdminStoreResponse,
    FetchError,
    AdminUpdateStore
  >
}

export const useUpdateStore = ({
  id,
  options
}: UseUpdateStoreProps): UseMutationResult<AdminStoreResponse, FetchError, AdminUpdateStore> => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload) => sdk.admin.store.update(id, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.list(),
      })
      queryClient.invalidateQueries({
        queryKey: pricePreferencesQueryKeys.details(),
      })
      queryClient.invalidateQueries({ queryKey: storeQueryKeys.details() })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
