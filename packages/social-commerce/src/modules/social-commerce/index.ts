import { Module } from "@medusajs/framework/utils"
import { SocialCommerceService } from "./services/social-commerce.service"

export const SOCIAL_COMMERCE_MODULE = "social_commerce"

export default Module(SOCIAL_COMMERCE_MODULE, {
  service: SocialCommerceService,
})

export { SocialCommerceService } from "./services/social-commerce.service"
export {
  InventoryReservationService,
  type RedisLikeClient,
} from "./services/inventory-reservation.service"
export {
  CatalogFeedService,
  type GenerateCatalogFeedOptions,
} from "./services/catalog-feed.service"
export * from "./models/index"
export * from "./providers/index"
export * from "./types/index"
export * from "./utils/medusa-error"
export * from "./utils/security"
