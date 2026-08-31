import { AdminPricePreferenceListParams, AdminPricePreferenceListResponse } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"

import { queryKeysFactory } from "../../lib/query-key-factory"
import { sdk } from "../../lib"

const PRICE_PREFERENCES_QUERY_KEY = "price-preferences" as const
export const pricePreferencesQueryKeys = queryKeysFactory(
  PRICE_PREFERENCES_QUERY_KEY
)

interface UsePricePreferencesProps {
  query?: AdminPricePreferenceListParams,
  options?: Omit<
    UseQueryOptions<
      AdminPricePreferenceListResponse,
      FetchError,
      AdminPricePreferenceListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
}

export const usePricePreferences = ({
  query,
  options
}: UsePricePreferencesProps) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.pricePreference.list(query),
    queryKey: pricePreferencesQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}
