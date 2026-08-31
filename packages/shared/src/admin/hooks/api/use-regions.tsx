import {
  QueryKey,
  UseQueryOptions,
  useQuery,
} from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import type Medusa from "@medusajs/js-sdk"
import { queryKeysFactory } from "../../lib"
import { AdminRegion, PaginatedResponse } from "@medusajs/framework/types"

const REGIONS_QUERY_KEY = "regions" as const
export const regionsQueryKeys = queryKeysFactory(REGIONS_QUERY_KEY)

interface UseRegionProps {
  sdk: Medusa
  id: string
  query?: Record<string, any>
  options?: Omit<
    UseQueryOptions<
      { region: AdminRegion },
      FetchError,
      { region: AdminRegion },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
}

export const useRegion = ({ sdk, id, query, options }: UseRegionProps) => {
  const { data, ...rest } = useQuery({
    queryKey: regionsQueryKeys.detail(id, query),
    queryFn: async () => sdk.admin.region.retrieve(id, query),
    ...options,
  })

  return { ...data, ...rest }
}

interface UseRegionsProps {
  sdk: Medusa
  query?: Record<string, any>
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{ regions: AdminRegion[] }>,
      FetchError,
      PaginatedResponse<{ regions: AdminRegion[] }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
}

export const useRegions = ({ sdk, query, options }: UseRegionsProps) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.region.list(query),
    queryKey: regionsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}
