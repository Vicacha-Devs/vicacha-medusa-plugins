import { resolveSocialCommerceService } from "../modules/social-commerce/index.js"
import type { SubscriberArgs, SubscriberConfig } from "./social-events.subscriber.js"

export interface OrderPlacedEventData {
  id: string
  cart_id?: string
  metadata?: Record<string, unknown> | null
}

/**
 * Automatically confirms held Live Shopping stock reservations when an order is placed.
 * Supports reservation IDs passed in `order.metadata.reservation_id`,
 * `order.metadata.live_reservation_ids`, or looked up by `cart_id`.
 */
export default async function handleOrderPlaced({
  event,
  container,
}: SubscriberArgs<OrderPlacedEventData>): Promise<void> {
  const socialService = resolveSocialCommerceService(container)

  const data = event?.data
  if (!data) return

  const reservationIds = new Set<string>()
  const metadata = data.metadata ?? {}

  if (typeof metadata.reservation_id === "string" && metadata.reservation_id.trim()) {
    reservationIds.add(metadata.reservation_id.trim())
  }

  if (Array.isArray(metadata.live_reservation_ids)) {
    for (const id of metadata.live_reservation_ids) {
      if (typeof id === "string" && id.trim()) {
        reservationIds.add(id.trim())
      }
    }
  }

  if (typeof data.cart_id === "string" && data.cart_id.trim()) {
    const cartReservations = await socialService.reservationService.listReservations({
      cart_id: data.cart_id.trim(),
      status: "held",
    })
    for (const res of cartReservations) {
      reservationIds.add(res.id)
    }
  }

  for (const reservationId of reservationIds) {
    await socialService.confirmLiveProductReservation(reservationId)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
