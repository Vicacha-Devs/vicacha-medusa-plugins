import { AdminOrderFilters, AdminOrderPreviewResponse } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory, sdk, TQueryKey } from "../../lib"

const ORDERS_QUERY_KEY = "orders" as const
const _orderKeys = queryKeysFactory(ORDERS_QUERY_KEY) as TQueryKey<"orders"> & {
  preview: (orderId: string) => any
  changes: (orderId: string) => any
  lineItems: (orderId: string, query?: any) => any
  shippingOptions: (orderId: string) => any
}

_orderKeys.preview = function (id: string) {
  return [this.detail(id), "preview"]
}

_orderKeys.changes = function (id: string) {
  return [this.detail(id), "changes"]
}

_orderKeys.lineItems = function (id: string, query?: any) {
  return [this.detail(id), query ? { query } : undefined, "lineItems"].filter(
    (k) => !!k
  )
}

_orderKeys.shippingOptions = function (id: string) {
  return [this.detail(id), "shippingOptions"]
}

export const ordersQueryKeys = _orderKeys

export const useOrderPreview = (
  id: string,
  query?: AdminOrderFilters,
  options?: Omit<
    UseQueryOptions<
      AdminOrderPreviewResponse,
      FetchError,
      AdminOrderPreviewResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: async () => sdk.admin.order.retrievePreview(id, query),
    queryKey: ordersQueryKeys.preview(id),
    ...options,
  })

  return { ...data, ...rest }
}