import { useQuery } from "@tanstack/react-query"

type FeatureFlags = Record<string, boolean>

const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  const res = await fetch("/admin/feature-flags", { credentials: "include" })
  if (!res.ok) return {}
  const json = await res.json()
  return json.feature_flags ?? {}
}

export const useFeatureFlags = () =>
  useQuery<FeatureFlags>({
    queryKey: ["admin", "feature-flags"],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

export const useFeatureFlag = (flag: string): boolean => {
  const { data } = useFeatureFlags()
  return data?.[flag] === true
}
