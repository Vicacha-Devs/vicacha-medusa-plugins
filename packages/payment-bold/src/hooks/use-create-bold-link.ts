import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldLinkPayload, BoldLinkResponse, BoldMutationHookOptions } from "../types"

export const useCreateBoldLink = (
  options?: UseMutationOptions<BoldLinkResponse, Error, BoldLinkPayload> &
    BoldMutationHookOptions
) => {
  const queryClient = useQueryClient()
  const sdk = options?.client || boldAdminSdk
  const targetKey = options?.queryKey || boldQueryKeys.link()

  return useMutation({
    mutationFn: (payload: BoldLinkPayload) => sdk.createPaymentLink(payload),
    onSuccess: (
      data: BoldLinkResponse,
      variables: BoldLinkPayload,
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
