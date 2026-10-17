# Modules

Custom Medusa module (`stories`) implementing Story Highlight Rings (`StoryGroup`), 9:16 Story Slides (`Story`), X/Y Product Hotspots (`StoryHotspot`), Interactive Stickers (`StorySticker`), and Conversion Funnel Analytics (`StoryEvent`).

```
modules/
├── story/
│   ├── index.ts                Module("stories", { service: StoriesModuleService })
│   ├── service.ts              StoriesModuleService (extends MedusaService)
│   ├── types.ts                DTOs, ring themes, placement zones, sticker & funnel types
│   ├── models/
│   │   └── index.ts            StoryGroup, Story, StoryHotspot, StorySticker, StoryEvent
│   └── utils/
│       └── security.ts         sanitizeSafeUrl, sanitizeHexColor, clampPercentage
└── stories/
    └── index.ts                Alias re-exporting ../story for backward compatibility
```

---

## Service Registration

- **Module token:** `STORIES_MODULE = "stories"` (100% compatible with `@bambiste/medusa-stories`)
- **Service class:** `StoriesModuleService`

---

## Data Models (`story/models/index.ts`)

| Model | Table Name | ID Prefix | Purpose |
| --- | --- | --- | --- |
| `StoryGroup` | `mps_story_group` | `sgrp_` | Highlight Ring container with `title`, `handle`, `avatar_url`, `ring_theme` (`instagram`, `tiktok`, `sunset`, `emerald`, `violet`, `cyber`, `neon`, `gold`, `minimal`, `custom`), `placement`, `target_entity_id`, `is_pinned`, `is_ephemeral`, `is_active`, and `display_order`. |
| `Story` | `story` | `stry_` | Individual 9:16 slide (`image` or `video`) with `group_id`, `title`, `caption`, `media_url`, `thumbnail_url`, `duration_ms`, `link_url`, `link_text`, `starts_at`, `expires_at`, and funnel counters (`views_count`, `completions_count`, `clicks_count`, `cart_conversions_count`). |
| `StoryHotspot` | `mps_story_hotspot` | `shsp_` | Product pin at `(x_percent, y_percent)` on a slide with `product_id`, `variant_id`, `product_title`, `product_handle`, `product_thumbnail`, `price_formatted`, `price_amount`, `currency_code`, `label`, and `badge_style` (`pill \| card \| dot`). |
| `StorySticker` | `mps_story_sticker` | `sstk_` | Interactive overlay (`poll`, `countdown`, `coupon`, `question_badge`) at `(x_percent, y_percent)` with `prompt`, `options`, `coupon_code`, `countdown_until`, and `total_interactions`. |
| `StoryEvent` | `mps_story_event` | `sevt_` | Funnel telemetry log (`impression`, `complete`, `tap_forward`, `tap_back`, `exit`, `hotspot_click`, `link_click`, `add_to_cart`, `sticker_interact`). |

---

## Key Service Methods (`story/service.ts`)

- **Story Groups (Highlight Rings):** `createGroup`, `updateGroup`, `deleteGroup`, `getGroupById`, `listGroups`
- **Story Slides:** `createSlide`, `updateSlide`, `deleteSlide`, `getSlideById`, `listSlides`, `listAdminStudioState`, `listStorefrontStories`
- **Product Hotspots:** `addHotspotToSlide`, `removeHotspot`, `removeHotspotsByProductId`
- **Interactive Stickers:** `addStickerToSlide`, `removeSticker`, `interactWithSticker`
- **Analytics & Expiration:** `recordEngagementEvent`, `getAnalyticsOverview`, `expireOutdatedStories`
