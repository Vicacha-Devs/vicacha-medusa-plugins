import { Module } from "@medusajs/framework/utils"
import { SocialCommerceService } from "./services/social-commerce.service.js"

export const SOCIAL_COMMERCE_MODULE = "social_commerce"

export default Module(SOCIAL_COMMERCE_MODULE, {
  service: SocialCommerceService,
})

export { SocialCommerceService } from "./services/social-commerce.service.js"
export {
  InventoryReservationService,
  type RedisLikeClient,
} from "./services/inventory-reservation.service.js"
export {
  CatalogFeedService,
  truncateAtWordBoundary,
  type GenerateCatalogFeedOptions,
  type MapMedusaProductsOptions,
} from "./services/catalog-feed.service.js"
export * from "./models/index.js"
export * from "./providers/index.js"
export * from "./types/index.js"
export * from "./utils/medusa-error.js"
export * from "./utils/security.js"
