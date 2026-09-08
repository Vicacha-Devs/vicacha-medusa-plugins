import { AdminCreatePaymentCollection, AdminDeletePaymentCollectionResponse, AdminMarkPaymentCollectionAsPaid, AdminPaymentCollectionResponse } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { useMutation, UseMutationOptions } from "@tanstack/react-query"

import { queryClient, queryKeysFactory, sdk } from "../../lib"
import { ordersQueryKeys } from "./use-order-preview"


const PAYMENT_COLLECTION_QUERY_KEY = "payment-collection" as const
export const paymentCollectionQueryKeys = queryKeysFactory(
  PAYMENT_COLLECTION_QUERY_KEY
)

export const useCreatePaymentCollection = (
  orderId: string,
  options?: UseMutationOptions<
    AdminPaymentCollectionResponse,
    FetchError,
    AdminCreatePaymentCollection
  >
) => {
  return useMutation({
    mutationFn: (payload) => sdk.admin.paymentCollection.create(payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: paymentCollectionQueryKeys.all,
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useMarkPaymentCollectionAsPaid = (
  orderId: string,
  paymentCollectionId: string,
  options?: UseMutationOptions<
    AdminPaymentCollectionResponse,
    FetchError,
    AdminMarkPaymentCollectionAsPaid
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      sdk.admin.paymentCollection.markAsPaid(paymentCollectionId, payload),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: paymentCollectionQueryKeys.all,
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeletePaymentCollection = (
  orderId: string,
  options?: Omit<
    UseMutationOptions<
      AdminDeletePaymentCollectionResponse,
      FetchError,
      string
    >,
    "mutationFn"
  >
) => {
  return useMutation({
    mutationFn: (id: string) => sdk.admin.paymentCollection.delete(id),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.details(),
      })

      queryClient.invalidateQueries({
        queryKey: ordersQueryKeys.preview(orderId),
      })

      queryClient.invalidateQueries({
        queryKey: paymentCollectionQueryKeys.all,
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
