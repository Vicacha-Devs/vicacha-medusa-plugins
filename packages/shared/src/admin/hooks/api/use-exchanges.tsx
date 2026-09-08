import { AdminExchangeListParams, AdminExchangeListResponse } from "@medusajs/framework/types"
import { queryKeysFactory, sdk } from "../../lib"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"

const EXCHANGES_QUERY_KEY = "exchanges" as const
export const exchangesQueryKeys = queryKeysFactory(EXCHANGES_QUERY_KEY)

export const useExchanges = (
  query?: AdminExchangeListParams,
  options?: Omit<
    UseQueryOptions<
      AdminExchangeListParams,
      FetchError,
      AdminExchangeListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.exchange.list(query),
    queryKey: exchangesQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}
