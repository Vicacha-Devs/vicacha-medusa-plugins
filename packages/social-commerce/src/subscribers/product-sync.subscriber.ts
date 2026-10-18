import {
  resolveSocialCommerceService,
  type CatalogFeedProductItem,
} from "../modules/social-commerce/index.js"
import type { SubscriberArgs, SubscriberConfig } from "./social-events.subscriber.js"

export interface ProductEventData {
  id: string
  items?: CatalogFeedProductItem[]
}

/**
 * Listens for Medusa `product.created` and `product.updated` events and pushes
 * updated catalog items to connected social accounts that have a configured catalog/shop ID.
 */
export default async function handleProductCatalogSync({
  event,
  container,
}: SubscriberArgs<ProductEventData>): Promise<void> {
  const socialService = resolveSocialCommerceService(container)
  const items = event?.data?.items
  if (!Array.isArray(items) || items.length === 0) {
    return
  }

  const accounts = await socialService.listAccounts({ status: "active" })
  for (const account of accounts) {
    if (account.platform === "local") continue
    if (!account.external_catalog_id && !account.external_shop_id && !account.catalog_id) continue

    try {
      await socialService.syncProductsToSocialCatalog(account.id, items)
    } catch {
      // Non-fatal in background subscriber; individual errors are recorded in CatalogSyncItem
    }
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
}
