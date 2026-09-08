import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, UseQueryOptions, useQuery } from "@tanstack/react-query"
import { AdminPluginsListResponse } from "@medusajs/framework/types"
import { queryKeysFactory, sdk } from "../../lib"

const PLUGINS_QUERY_KEY = "plugins" as const
export const pluginsQueryKeys = queryKeysFactory(PLUGINS_QUERY_KEY)

export const usePlugins = (
  options?: Omit<
    UseQueryOptions<
      any,
      FetchError,
      AdminPluginsListResponse,
      QueryKey
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.plugin.list(),
    queryKey: pluginsQueryKeys.list(),
    ...options,
  })

  return { ...data, ...rest }
}
