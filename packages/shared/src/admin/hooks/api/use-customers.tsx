import { AdminCreateCustomer, AdminCustomer } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { useMutation, UseMutationOptions } from "@tanstack/react-query"

import { queryClient, queryKeysFactory, sdk } from "../../lib"

const CUSTOMERS_QUERY_KEY = "customers" as const
export const customersQueryKeys = queryKeysFactory(CUSTOMERS_QUERY_KEY)
export const customerAddressesQueryKeys = queryKeysFactory(
  `${CUSTOMERS_QUERY_KEY}-addresses`
)

export const useCreateCustomer = (
  options?: UseMutationOptions<
    { customer: AdminCustomer },
    FetchError,
    AdminCreateCustomer
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.customer.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: customersQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

