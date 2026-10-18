import { MedusaError, Module } from "@medusajs/framework/utils"
import { SocialCommerceService } from "./services/social-commerce.service"

export const SOCIAL_COMMERCE_MODULE = "social_commerce"
export const SOCIAL_COMMERCE_LEGACY_MODULE = "SocialCommerce"

export function resolveSocialCommerceService(scope: {
  resolve: <T = unknown>(key: string) => T
}): SocialCommerceService {
  try {
    const primary = scope.resolve<SocialCommerceService | null | undefined>(
      SOCIAL_COMMERCE_MODULE
    )
    if (primary) {
      return primary
    }
  } catch {
    // Fallback to legacy PascalCase registration key below
  }

  const fallback = scope.resolve<SocialCommerceService>(
    SOCIAL_COMMERCE_LEGACY_MODULE
  )
  if (!fallback) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Unable to resolve SocialCommerceService via "${SOCIAL_COMMERCE_MODULE}" or "${SOCIAL_COMMERCE_LEGACY_MODULE}".`
    )
  }
  return fallback
}

export default Module(SOCIAL_COMMERCE_MODULE, {
  service: SocialCommerceService,
})

export { SocialCommerceService } from "./services/social-commerce.service"
export {
  InventoryReservationService,
  RedisReservationStore,
  InMemoryReservationStore,
  type RedisLikeClient,
  type ReservationStoreBackend,
} from "./services/inventory-reservation.service"
export {
  CatalogFeedService,
  truncateAtWordBoundary,
  type GenerateCatalogFeedOptions,
  type MapMedusaProductsOptions,
} from "./services/catalog-feed.service"
export {
  SocialCommerceRepository,
  type SocialCommerceOrmHost,
} from "./services/social-commerce.repository"
export { SocialAccountService } from "./services/social-account.service"
export { SocialMediaService } from "./services/social-media.service"
export { LiveShoppingService } from "./services/live-shopping.service"
export { SocialWebhookService } from "./services/social-webhook.service"
export * from "./services/social-commerce-normalizers"
export * from "./models/index"
export * from "./providers/index"
export * from "./types/index"
export * from "./utils/medusa-error"
export * from "./utils/security"
