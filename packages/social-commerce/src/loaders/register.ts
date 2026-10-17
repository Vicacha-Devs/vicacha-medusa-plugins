import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { SocialCommerceModuleOptions } from "../modules/social-commerce/types/index.js"

export interface LoaderArgs {
  container: {
    resolve: <T = unknown>(key: string) => T
  }
  options?: SocialCommerceModuleOptions
}

export default async function registerSocialCommerceLoader({
  container,
  options,
}: LoaderArgs): Promise<void> {
  let logger: { info: (msg: string) => void; warn: (msg: string) => void } = console
  try {
    const resolvedLogger = container.resolve<typeof logger>(
      ContainerRegistrationKeys.LOGGER
    )
    if (resolvedLogger && typeof resolvedLogger.info === "function") {
      logger = resolvedLogger
    }
  } catch {
    // Fallback to console
  }

  const configuredPlatforms: string[] = ["local"]
  if (options?.tiktok?.client_key || process.env.TIKTOK_CLIENT_KEY) {
    configuredPlatforms.push("tiktok")
  }
  if (options?.meta?.app_id || process.env.META_APP_ID) {
    configuredPlatforms.push("instagram", "facebook")
  }

  const reservationMode =
    options?.redis_url || process.env.REDIS_URL ? "redis" : "memory"

  logger.info(
    `[medusa-plugin-social-commerce] Initialized (platforms: ${configuredPlatforms.join(
      ", "
    )} | reservation engine: ${reservationMode})`
  )
}
