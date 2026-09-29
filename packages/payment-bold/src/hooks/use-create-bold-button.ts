import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldButtonPayload, BoldButtonResponse, BoldMutationHookOptions } from "../types"

export const useCreateBoldButton = (
  options?: UseMutationOptions<BoldButtonResponse, Error, BoldButtonPayload> &
    BoldMutationHookOptions
) => {
  const queryClient = useQueryClient()
  const sdk = options?.client || boldAdminSdk
  const targetKey = options?.queryKey || boldQueryKeys.button()

  return useMutation({
    mutationFn: (payload: BoldButtonPayload) => sdk.createPaymentButton(payload),
    onSuccess: (
      data: BoldButtonResponse,
      variables: BoldButtonPayload,
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