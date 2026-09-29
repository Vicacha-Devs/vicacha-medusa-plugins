import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldMutationHookOptions, BoldQrPayload, BoldQrResponse } from "../types"


export const useCreateBoldQr = (
  options?: UseMutationOptions<BoldQrResponse, Error, BoldQrPayload> &
    BoldMutationHookOptions
) => {
  const queryClient = useQueryClient()
  const sdk = options?.client || boldAdminSdk
  const targetKey = options?.queryKey || boldQueryKeys.qr()

  return useMutation({
    mutationFn: (payload: BoldQrPayload) => sdk.createPaymentQr(payload),
    onSuccess: (
      data: BoldQrResponse,
      variables: BoldQrPayload,
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