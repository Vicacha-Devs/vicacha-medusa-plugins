import type { NotificationChannel } from "../types"

/**
 * Default non-secret operational configuration for a channel that has none yet.
 */
export function buildDefaultChannelConfig(
  channel: NotificationChannel,
  driver: string
) {
  const defaultRate =
    channel === "telegram"
      ? 30
      : channel === "whatsapp"
        ? Number(process.env.WHATSAPP_SEND_CONCURRENCY || 5)
        : 10
  return {
    channel,
    driver,
    is_enabled: true,
    is_verified: channel === "email" || channel === "dummy",
    rate_limit_per_sec: defaultRate,
    config_json: {},
  }
}

/**
 * Merges `config_json` updates, strips accidental secret fields, and resets
 * `is_verified` for Telegram if `merchant_channel_id` changes
 * (`medusa-notification-provider` pattern).
 */
export function mergeChannelConfigUpdate(
  current: Record<string, any>,
  params: {
    channel: NotificationChannel
    is_verified?: boolean
    config_json?: Record<string, any>
  }
): { nextConfigJson: Record<string, any>; isVerified: boolean } {
  const prevConfigJson = (current.config_json || {}) as Record<string, any>
  const nextConfigJson = params.config_json
    ? { ...prevConfigJson, ...params.config_json }
    : prevConfigJson

  // Strip any accidental secret fields before saving to DB
  for (const key of Object.keys(nextConfigJson)) {
    if (/(token|secret|password|api_key|private_key)/i.test(key)) {
      delete nextConfigJson[key]
    }
  }

  let isVerified =
    params.is_verified !== undefined ? params.is_verified : current.is_verified

  if (
    params.channel === "telegram" &&
    params.config_json?.merchant_channel_id &&
    params.config_json.merchant_channel_id !==
      prevConfigJson.merchant_channel_id &&
    params.is_verified === undefined
  ) {
    isVerified = false
  }

  return { nextConfigJson, isVerified }
}
