import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type NotificationsModuleService from "../modules/notifications/service"
import { NOTIFICATIONS_MODULE } from "../modules/notifications/types"
import { normalizeE164Phone } from "../modules/notifications/utils/security"
import { executeEventNotificationsDispatch } from "../workflows"

/**
 * Abandoned Cart Recovery Runner (inspired by `@signalhouse-sms/medusa-plugin`).
 * Checks every 15 minutes, enforces explicit opt-in consent and a strict 24-hour per-phone cooldown,
 * and emits `cart.abandoned` notifications with a direct checkout recovery link.
 */
export async function runAbandonedCartRecoveryJob(
  container: MedusaContainer
): Promise<{ checked: number; sent: number; skipped: number }> {
  const mpnService = container.resolve(
    NOTIFICATIONS_MODULE
  ) as NotificationsModuleService
  const opts = mpnService.getPluginOptions()

  const enabled =
    opts.enableCartRecovery ??
    process.env.SIGNALHOUSE_CART_ABANDONMENT_ENABLED === "true"
  if (!enabled) {
    return { checked: 0, sent: 0, skipped: 0 }
  }

  const thresholdMinutes = Math.max(
    15,
    Number(
      opts.cartAbandonmentThresholdMinutes ||
        process.env.SIGNALHOUSE_CART_ABANDONMENT_THRESHOLD_MINUTES ||
        60
    )
  )
  const recoveryBaseUrl = (
    opts.cartRecoveryUrlBase ||
    process.env.SIGNALHOUSE_CART_RECOVERY_URL_BASE ||
    opts.storeUrl ||
    process.env.STORE_URL ||
    "https://store.example.com/cart/recover"
  ).replace(/\/$/, "")

  let carts: Array<Record<string, any>> = []
  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
    if (query && typeof query.graph === "function") {
      const { data } = await query.graph({
        entity: "cart",
        fields: [
          "id",
          "email",
          "total",
          "currency_code",
          "completed_at",
          "updated_at",
          "shipping_address.*",
          "customer.*",
          "items.*",
        ],
      })
      if (Array.isArray(data)) {
        carts = data
      }
    }
  } catch {
    return { checked: 0, sent: 0, skipped: 0 }
  }

  const nowMs = Date.now()
  const cutoffMs = nowMs - thresholdMinutes * 60 * 1000
  const cooldownMs = 24 * 60 * 60 * 1000
  let sent = 0
  let skipped = 0

  for (const cart of carts) {
    if (cart.completed_at) continue
    if (!Array.isArray(cart.items) || cart.items.length === 0) continue

    const updatedAtMs = cart.updated_at ? new Date(cart.updated_at).getTime() : 0
    if (!updatedAtMs || updatedAtMs > cutoffMs) {
      continue
    }

    const phone = normalizeE164Phone(
      cart.shipping_address?.phone || cart.customer?.phone
    )
    if (!phone) {
      skipped++
      continue
    }

    const consentRows = await mpnService.listMpnConsentRecords({
      identifier: phone,
    })
    const activeConsent = consentRows.find(
      (r: any) => r.status === "opted_in"
    )
    if (!activeConsent) {
      skipped++
      continue
    }

    // Enforce max 1 cart recovery text per phone per 24 hours
    if (activeConsent.last_cart_recovery_at) {
      const lastSentMs = new Date(activeConsent.last_cart_recovery_at).getTime()
      if (nowMs - lastSentMs < cooldownMs) {
        skipped++
        continue
      }
    }

    const outcome = await executeEventNotificationsDispatch(container, {
      event_name: "cart.abandoned",
      event_data: {
        id: cart.id,
        first_name:
          cart.shipping_address?.first_name ||
          cart.customer?.first_name ||
          "Customer",
        email: cart.email || cart.customer?.email || "",
        phone,
        total: cart.total,
        currency_code: cart.currency_code || "USD",
        recovery_url: `${recoveryBaseUrl}?cart_id=${encodeURIComponent(cart.id)}`,
      },
    })

    if (outcome.sent_count > 0) {
      await mpnService.updateMpnConsentRecords({
        id: activeConsent.id,
        last_cart_recovery_at: new Date(),
      })
      sent++
    } else {
      skipped++
    }
  }

  return { checked: carts.length, sent, skipped }
}

export default async function abandonedCartRecoveryJobHandler(
  container: MedusaContainer
) {
  await runAbandonedCartRecoveryJob(container)
}

export const config = {
  name: "mpn-abandoned-cart-recovery",
  schedule: "*/15 * * * *",
}
