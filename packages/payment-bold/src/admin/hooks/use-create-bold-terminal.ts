import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../../sdk/client"
import { boldQueryKeys } from "../../sdk/query-keys"
import { BoldMutationHookOptions, BoldTerminalPayload, BoldTerminalResponse } from "../../types"

export const usePushToBoldTerminal = (
  options?: UseMutationOptions<BoldTerminalResponse, Error, BoldTerminalPayload> &
    BoldMutationHookOptions
) => {
  const queryClient = useQueryClient()
  const sdk = options?.client || boldAdminSdk
  const targetKey = options?.queryKey || boldQueryKeys.orders()

  return useMutation({
    mutationFn: (payload: BoldTerminalPayload) => sdk.pushToTerminal(payload),
    onSuccess: (
      data: BoldTerminalResponse,
      variables: BoldTerminalPayload,
      context: unknown
    ) => {
      if (targetKey && targetKey.length > 0) {
        queryClient.invalidateQueries({ queryKey: targetKey as any })
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}