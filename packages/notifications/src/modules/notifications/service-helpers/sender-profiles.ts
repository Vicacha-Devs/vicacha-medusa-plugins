import type { NotificationsPluginOptions, SenderProfileConfig } from "../types"

/**
 * Resolves configured SMTP sender profiles (1..5) from environment variables (`@sam-ael/medusa-plugin-mailer` pattern).
 */
export function resolveSenderProfiles(
  options: NotificationsPluginOptions
): SenderProfileConfig[] {
  const profiles: SenderProfileConfig[] = []
  for (let i = 1; i <= 5; i++) {
    const name = process.env[`MAILER_FROM_NAME_${i}`]
    const addr = process.env[`MAILER_FROM_ADDRESS_${i}`]
    if (addr) {
      profiles.push({
        index: i,
        name: name || options.storeName || "Medusa Store",
        from_address: addr,
        reply_to: process.env[`MAILER_REPLY_TO_${i}`] || undefined,
      })
    }
  }
  if (profiles.length === 0) {
    profiles.push({
      index: 1,
      name:
        process.env.MAILER_FROM_NAME_1 ||
        options.storeName ||
        "Medusa Store",
      from_address:
        process.env.MAILER_FROM_ADDRESS_1 ||
        process.env.SMTP_FROM ||
        "no-reply@example.com",
    })
  }
  return profiles
}
