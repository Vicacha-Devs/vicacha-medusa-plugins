import { AdminCustomerGroupListResponse, AdminGetCustomerGroupsParams } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"

import { queryKeysFactory, sdk } from "../../lib"

const CUSTOMER_GROUPS_QUERY_KEY = "customer_groups" as const
export const customerGroupsQueryKeys = queryKeysFactory(
  CUSTOMER_GROUPS_QUERY_KEY
)

export const useCustomerGroups = (
  query?: AdminGetCustomerGroupsParams,
  options?: Omit<
    UseQueryOptions<
      AdminGetCustomerGroupsParams,
      FetchError,
      AdminCustomerGroupListResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.customerGroup.list(query),
    queryKey: customerGroupsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}