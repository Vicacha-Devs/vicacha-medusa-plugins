# Links

Cross-entity associations in `@vicacha-devs/medusa-plugin-stories`.

```
links/
└── README.md
```

---

## Overview

`@vicacha-devs/medusa-plugin-stories` associates story slides and highlight rings with Medusa core entities (`Product`, `ProductVariant`, `ProductCollection`, `ProductCategory`) via indexed identifier columns on its module models rather than cross-module join tables:

- **`StoryHotspot`** (`src/modules/story/models/index.ts`) — stores `story_id`, `product_id` (indexed), `variant_id`, and denormalized product card metadata (`product_title`, `product_handle`, `product_thumbnail`, `price_formatted`, `price_amount`, `currency_code`, `x_percent`, `y_percent`) for zero-latency 9:16 player rendering.
- **`StoryGroup`** (`src/modules/story/models/index.ts`) — stores `placement` (`home`, `collection`, `category`, `product`, `floating_bubble`, `global`) and `target_entity_id` to scope Highlight Rings to specific collections, categories, or product pages.
- **`product-deleted.ts` subscriber** (`src/subscribers/product-deleted.ts`) — listens to `product.deleted` and calls `storiesService.removeHotspotsByProductId(productId)` to keep hotspot references clean.
