import {
  SOCIAL_COMMERCE_MODULE,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"
import type { ScheduledJobContext } from "./sync-social-media-and-tokens.job.js"

export default async function cleanupReservationsJob({
  container,
}: ScheduledJobContext): Promise<{
  reclaimed_reservations: number
}> {
  const socialService = container.resolve<SocialCommerceService>(
    SOCIAL_COMMERCE_MODULE
  )

  const reclaimed =
    await socialService.reservationService.cleanupExpiredReservations()

  return {
    reclaimed_reservations: reclaimed,
  }
}

export const config = {
  name: "social-commerce-cleanup-expired-reservations",
  schedule: "0 */5 * * * *", // Every 5 minutes
}
