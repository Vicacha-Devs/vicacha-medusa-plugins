import { AdminOrder, AdminOrderLineItem, AdminPayment, AdminPaymentCollection } from "@medusajs/framework/types"


export const getPaymentsFromOrder = (order: AdminOrder) => {
  return order.payment_collections
    .map((collection: AdminPaymentCollection) => collection.payments)
    .flat(1)
    .filter(Boolean) as AdminPayment[]
}

/**
 * Returns a limit for number of reservations that order can have.
 */
export function getReservationsLimitCount(order: AdminOrder) {
  if (!order?.items?.length) {
    return 0
  }

  return order.items.reduce(
    (acc: number, item: AdminOrderLineItem) =>
      acc + (item.variant?.inventory_items?.length || 1),
    0
  )
}
