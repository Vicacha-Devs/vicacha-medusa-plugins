import { useQuery, UseQueryOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldMutationHookOptions, BoldTerminalItem } from "../types"

export const useBoldTerminals = (
  options?: Omit<
    UseQueryOptions<BoldTerminalItem[], Error, BoldTerminalItem[]>,
    "queryKey" | "queryFn"
  > &
    BoldMutationHookOptions
) => {
  const sdk = options?.client || boldAdminSdk
  const queryKey = options?.queryKey || boldQueryKeys.terminals()

  return useQuery({
    queryKey,
    queryFn: () => sdk.getTerminals(),
    ...options,
  })
}
