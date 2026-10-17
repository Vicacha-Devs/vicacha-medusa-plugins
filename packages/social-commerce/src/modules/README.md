# Modules

Custom Medusa module (`social_commerce`) implementing multi-platform OAuth 2.0 + PKCE, AES-256-GCM token encryption, shoppable media & 24h stories, live shopping stock reservations, and outbound product catalog feeds.

```
modules/
└── social-commerce/
    ├── index.ts                                  Module("social_commerce", { service: SocialCommerceService })
    ├── migrations/
    │   └── Migration20261013000000.ts            Creates the 6 social_commerce tables and indexes
    ├── models/
    │   ├── index.ts                              Barrel exporting all 6 DML models
    │   ├── social-account.ts                     SocialAccount (social_account)
    │   ├── social-media-post.ts                  SocialMediaPost (social_media_post)
    │   ├── social-product-tag.ts                 SocialProductTag (social_product_tag)
    │   ├── live-session.ts                       LiveSession (live_session)
    │   ├── live-product.ts                       LiveProduct (live_product)
    │   └── catalog-sync-item.ts                  CatalogSyncItem (catalog_sync_item)
    ├── providers/
    │   ├── index.ts                              Exports TikTokProvider & MetaGraphProvider
    │   ├── tiktok.provider.ts                    TikTok OAuth v2, Display API v2, TikTok Shop Catalog & Webhooks
    │   └── meta-graph.provider.ts                Instagram & Facebook Graph API v21.0, Meta Catalog items_batch & Webhooks
    ├── services/
    │   ├── social-commerce.service.ts            SocialCommerceService (extends MedusaService)
    │   ├── inventory-reservation.service.ts      InventoryReservationService (Redis Lua + in-memory mutex/TTL)
    │   └── catalog-feed.service.ts               CatalogFeedService (XML RSS 2.0, CSV, JSON & SHA-256 checksums)
    ├── types/
    │   └── index.ts                              Module DTOs, provider interfaces, and workflow types
    └── utils/
        ├── medusa-error.ts                       MedusaError factory helper
        └── security.ts                           AES-256-GCM token vault, PKCE S256, signed OAuth state, HMAC-SHA256
```

---

## Service Token

- **Module token:** `SOCIAL_COMMERCE_MODULE = "social_commerce"`
- **Primary service:** `SocialCommerceService`

---

## Sub-services

### 1. `SocialCommerceService` (`services/social-commerce.service.ts`)
- **OAuth & Accounts:** `initiateOAuthConnect`, `completeOAuthCallback`, `listAccounts`, `getAccount`, `updateAccountSettings`, `disconnectAccount`, `refreshAccountToken`, `refreshExpiringAccounts`
- **Media & 24h Stories:** `syncAccountMedia`, `syncAllAccountsMedia`, `publishLocalStory`, `listFeedPosts`, `listActiveStories`, `getPostWithTags`, `modifyMediaPost`, `purgeMediaPost`, `cleanupExpiredStories`
- **Product Hotspot Tagging:** `tagProductsOnPost`, `untagProductFromPost`, `listPostProductTags`
- **Live Selling & Flash-Sale Reservations:** `scheduleLiveSession`, `startLiveSession`, `endLiveSession`, `listLiveSessions`, `getLiveSessionWithProducts`, `pinProductsToLiveSession`, `reserveLiveProductStock`, `confirmLiveProductReservation`, `releaseLiveProductReservation`
- **Catalog Sync & Checkout Handoff:** `syncProductsToSocialCatalog`, `listCatalogSyncItems`, `renderCatalogFeed`, `createCheckoutHandoff`, `verifyAndParseWebhook`

### 2. `InventoryReservationService` (`services/inventory-reservation.service.ts`)
- Supports **Redis Lua atomic mode** (`EVAL` script checking `allocated - reserved - sold >= quantity`) and **in-memory mutex/TTL fallback mode**.
- Methods: `allocateVariantStock`, `reserveStock`, `confirmReservation`, `releaseReservation`, `cleanupExpiredReservations`, `getStockSnapshot`, `listReservations`.

### 3. `CatalogFeedService` (`services/catalog-feed.service.ts`)
- Generates Meta / Google Merchant RSS 2.0 XML (`g:id`, `g:price`, `g:availability`, `g:image_link`), RFC-4180 CSV (with formula-injection escaping), and JSON product feeds, plus deterministic SHA-256 item checksums (`computeItemChecksum`) for incremental catalog sync.
