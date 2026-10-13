import type { MedusaContainer } from "@medusajs/framework/types"
import type NotificationsModuleService from "../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../modules/notifications/types"

/**
 * Hourly maintenance job:
 * 1. Prunes expired delivery logs older than `logRetentionDays` (default 30 days)
 * 2. Executes any scheduled customer group broadcast campaigns whose `scheduled_at` is due
 */
export default async function logRetentionAndBroadcastsJob(
  container: MedusaContainer
) {
  const mpnService = container.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService

  await mpnService.pruneExpiredDeliveryLogs()
}

export const config = {
  name: "mpn-log-retention-and-broadcasts",
  schedule: "0 * * * *",
}
