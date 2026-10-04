import { BoldPaymentMethod } from "@payment-bold/types"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"

export const useBoldPaymentMethods = (
  options?: Omit<
    UseQueryOptions<Array<BoldPaymentMethod>, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: boldQueryKeys.paymentMethods(),
    queryFn: () => boldAdminSdk.getPaymentMethods(),
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
    ...options,
  })
}