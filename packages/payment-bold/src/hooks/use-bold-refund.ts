import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldRefundPayload, BoldRefundResponse, BoldMutationHookOptions } from "../types"

export const useBoldRefund = (
  options?: UseMutationOptions<BoldRefundResponse, Error, BoldRefundPayload> &
    BoldMutationHookOptions
) => {
  const queryClient = useQueryClient()
  const sdk = options?.client || boldAdminSdk
  const targetKey = options?.queryKey || boldQueryKeys.refund()

  return useMutation({
    mutationFn: (payload: BoldRefundPayload) => sdk.refundPayment(payload),
    onSuccess: (data, variables, context) => {
      if (targetKey && targetKey.length > 0) {
        queryClient.invalidateQueries({ queryKey: targetKey as any })
      }
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
