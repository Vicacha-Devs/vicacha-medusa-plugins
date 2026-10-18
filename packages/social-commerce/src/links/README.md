# Links

Cross-entity associations in `@vicacha-devs/medusa-plugin-social-commerce`.

```
links/
└── README.md
```

---

## Overview

`@vicacha-devs/medusa-plugin-social-commerce` stores Medusa product and variant identifiers as indexed text columns on its module models rather than creating cross-module database join tables:

- **`SocialProductTag`** (`src/modules/social-commerce/models/social-product-tag.ts`) — stores `social_post_id`, `product_id`, and `variant_id` (along with `timestamp_seconds`, `position_x`, `position_y`, and `label`).
- **`LiveProduct`** (`src/modules/social-commerce/models/live-product.ts`) — stores `live_session_id`, `product_id`, and `variant_id` (unique index on `["live_session_id", "variant_id"]`).
- **`CatalogSyncItem`** (`src/modules/social-commerce/models/catalog-sync-item.ts`) — stores `social_account_id`, `medusa_product_id`, and `medusa_variant_id` (unique index on `["social_account_id", "medusa_variant_id"]`).

This design keeps social feed queries, live-stream stock reservations, and outbound catalog checksum lookups self-contained inside the `social_commerce` module while allowing event subscribers (`product-sync.subscriber.ts`, `order-placed.subscriber.ts`) and Admin widgets (`product-social-widget.tsx`) to query by `product_id` or `variant_id`.