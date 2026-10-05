import { useQuery, UseQueryOptions } from "@tanstack/react-query"

import { boldAdminSdk } from "../sdk/client"
import { boldQueryKeys } from "../sdk/query-keys"
import { BoldIntegrationAPIPaymentMethod, BoldPaymentLinkPaymentMethodLimits } from "@payment-bold/types"

export const useBoldIntegrationApiPaymentMethods = (
  options?: Omit<
    UseQueryOptions<Array<BoldIntegrationAPIPaymentMethod>, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [...boldQueryKeys.paymentMethods(), "integration-api"],
    queryFn: () => boldAdminSdk.getPaymentMethods(),
    staleTime: 1000 * 60 * 15,
    ...options,
  })
}

export const useBoldPaymentLinkPaymentMethods = (
  options?: Omit<
    UseQueryOptions<BoldPaymentLinkPaymentMethodLimits, Error>,
    "queryKey" | "queryFn"
  >
) => {
  return useQuery({
    queryKey: [...boldQueryKeys.paymentMethods(), "payment-link"],
    queryFn: () => boldAdminSdk.getPaymentLinkPaymentMethods(),
    staleTime: 1000 * 60 * 15,
    ...options,
  })
}
