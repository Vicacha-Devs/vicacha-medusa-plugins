import { AdminClaimListParams, AdminClaimListResponse } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory, sdk } from "../../lib"

const CLAIMS_QUERY_KEY = "claims" as const
export const claimsQueryKeys = queryKeysFactory(CLAIMS_QUERY_KEY)

export const useClaims = (
  query?: AdminClaimListParams,
  options?: Omit<
    UseQueryOptions<
      AdminClaimListParams,
      FetchError,
      AdminClaimListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.claim.list(query),
    queryKey: claimsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}