import { AdminGetReservationsParams, AdminReservationListResponse } from "@medusajs/framework/types"
import { FetchError } from "@medusajs/js-sdk"
import { QueryKey, useQuery, UseQueryOptions } from "@tanstack/react-query"
import { queryKeysFactory, sdk } from "../../lib"

const RESERVATION_ITEMS_QUERY_KEY = "reservation_items" as const
export const reservationItemsQueryKeys = queryKeysFactory(
  RESERVATION_ITEMS_QUERY_KEY
)

export const useReservationItems = (
  query?: AdminGetReservationsParams,
  options?: Omit<
    UseQueryOptions<
      AdminGetReservationsParams,
      FetchError,
      AdminReservationListResponse,
      QueryKey
    >,
    "queryKey" | "queryFn"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () => sdk.admin.reservation.list(query),
    queryKey: reservationItemsQueryKeys.list(query),
    ...options,
  })

  return { ...data, ...rest }
}