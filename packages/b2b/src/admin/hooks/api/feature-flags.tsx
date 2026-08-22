import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/client"

// TODO: remove once required feature is exposed: https://github.com/medusajs/medusa/discussions/16500

export type FeatureFlags = {
  view_configurations?: boolean
  translation?: boolean
  rbac?: boolean
  [key: string]: boolean | undefined
}

export const useFeatureFlags = () => {
  return useQuery<FeatureFlags>({
    queryKey: ["admin", "feature-flags"],
    queryFn: async () => {
      const response = await sdk.client.fetch<{ feature_flags: FeatureFlags }>(
        "/admin/feature-flags",
        { method: "GET" }
      )
      return response.feature_flags
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export const useFeatureFlag = (flag: keyof FeatureFlags): boolean => {
  const { data } = useFeatureFlags()
  return data?.[flag] === true
}
