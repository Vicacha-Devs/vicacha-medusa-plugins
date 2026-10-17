# `@vicacha-devs/medusa-plugin-stories`

Full-featured **9:16 Shoppable Stories, Highlight Rings, Interactive Stickers, Conversion Funnel Analytics, and Storefront React UI Kit** for **Medusa v2 (`2.21.x`)**.

100% drop-in backward-compatible with `@bambiste/medusa-stories` (`STORIES_MODULE = "stories"`, `Story` model, `expireStoriesWorkflow`) while adding multi-slide Story Highlight Rings (`StoryGroup`), interactive X/Y Product Hotspots (`StoryHotspot`), Poll/Countdown/Coupon/Q&A Stickers (`StorySticker`), Conversion Funnel Analytics (`StoryEvent`), a visual 9:16 Admin Studio, a Product Details Admin Widget, and drop-in Storefront React components (`@vicacha-devs/medusa-plugin-stories/ui`).

> **Medusa compatibility:** `2.21.x` — keep peer dependencies aligned with your host application.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation & Configuration](#installation--configuration)
- [Architecture](#architecture)
- [Module & Data Models](#module--data-models)
- [Workflows](#workflows)
- [Scheduled Jobs & Subscribers](#scheduled-jobs--subscribers)
- [REST API](#rest-api)
- [Admin UI & Widgets](#admin-ui--widgets)
- [Storefront SDK, Hooks & UI Kit](#storefront-sdk-hooks--ui-kit)
- [Development](#development)
- [License](#license)

---

## Features

- **Multi-Slide Story Groups & Highlight Rings (`StoryGroup`)** — Organize 9:16 slides into circular Highlight Rings (`instagram`, `tiktok`, `sunset`, `emerald`, `violet`, `cyber`, `neon`, `gold`, `minimal`, or `custom` hex gradients) scoped by placement zone (`home`, `collection`, `category`, `product`, `floating_bubble`, `global`).
- **Interactive X/Y Shoppable Product Hotspots (`StoryHotspot`)** — Pin up to `max_hotspots_per_slide` Medusa products at exact `(x_percent, y_percent)` coordinates on any 9:16 image or video slide with `pill`, `card`, or `dot` badge styles.
- **Interactive Engagement Stickers (`StorySticker`)** — Attach live **Polls** (with real-time vote tallying), **Countdown Timers**, **One-Tap Coupon Reveal badges**, and **Q&A Boxes** to slides.
- **24-Hour Ephemeral & Pinned Highlights** — Schedule `starts_at` and `expires_at` timestamps with automatic cron cleanup (`expire-ephemeral-stories` every 15 minutes) or pin evergreen Highlight Rings.
- **Conversion Funnel Analytics (`StoryEvent`)** — Track `impression` → `complete` → `hotspot_click` → `link_click` → `add_to_cart` → `sticker_interact` with per-slide completion rates and Hotspot CTR.
- **Decoupled Admin Studio & Product Widget (`src/admin/`)** —
  - `/stories`, `/stories/canvas`, `/stories/rings`, `/stories/rings/create`, `/stories/stickers`, `/stories/analytics` — 9:16 Visual Canvas & Hotspot Tagger, Highlight Rings Manager, Interactive Stickers Builder, and Conversion Funnel Analytics (`< 170` lines per file), localized across 10 languages (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar`).
  - `product.details.after` Widget — See which stories feature a product and 1-click generate a shoppable 9:16 slide directly from the product page.
- **Drop-In Storefront React UI Kit (`@vicacha-devs/medusa-plugin-stories/ui`)** —
  - `<StoryRingsBar />` — Circular animated Story Highlight rings with seen/unseen `localStorage` state.
  - `<StoryPlayerModal />` — Fullscreen 9:16 modal with segmented progress bars, hold-to-pause, keyboard arrows, hotspot pins, interactive stickers, and bottom product sheet.
  - `<StoryHotspotPin />` & `<StoryProductSheet />` — Standalone building blocks for custom storefront players.

---

## Requirements

| Dependency | Version |
|---|---|
| `@medusajs/medusa` | `2.21.x` |
| Node.js | `^20.19.0 \|\| >=22.12.0` |
| Package Manager | `pnpm 11.x` / `npm` / `yarn` |

---

## Installation & Configuration

```bash
pnpm add @vicacha-devs/medusa-plugin-stories
```

Register the plugin in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-stories",
      options: {
        default_slide_duration_ms: 5000,
        max_hotspots_per_slide: 6,
      },
    },
  ],
})
```

Run database migrations to create the 5 module tables:

```bash
npx medusa db:migrate
```

---

## Architecture

```text
Medusa v2 Host Application
  ├── Module: stories (StoriesModuleService)
  │     ├─ StoryGroup (mps_story_group) ── 1:N ──► Story (story)
  │     │                                            ├─ StoryHotspot[] (mps_story_hotspot)
  │     │                                            ├─ StorySticker[] (mps_story_sticker)
  │     │                                            └─ StoryEvent[]   (mps_story_event)
  │     └─ Security utils: sanitizeSafeUrl, sanitizeHexColor, clampPercentage
  ├── Workflows: create-story-group, create-story-slide, record-story-engagement, expire-ephemeral-stories
  ├── Job: expire-ephemeral-stories (*/15 * * * *)
  ├── Subscriber: product.deleted (removes StoryHotspot rows for deleted products)
  ├── Admin UI (/stories/* + product.details.after widget)
  └── Storefront SDK, Hooks (useStoreStories, useStoryPlayer) & UI Kit (StoryRingsBar, StoryPlayerModal)
```

---

## Module & Data Models

**Module Service Token:** `STORIES_MODULE = "stories"` (100% compatible with `@bambiste/medusa-stories`, also re-exported at `src/modules/stories/index.ts`)  
**Service Class:** `StoriesModuleService` (`src/modules/story/service.ts`)

| Model | Table Name | Prefix | Key Columns |
|---|---|---|---|
| `StoryGroup` | `mps_story_group` | `sgrp_` | `id`, `title`, `handle`, `subtitle`, `avatar_url`, `ring_theme`, `custom_ring_color`, `placement`, `target_entity_id`, `is_pinned`, `is_ephemeral`, `is_active`, `display_order`, `metadata` |
| `Story` | `story` | `stry_` | `id`, `group_id`, `title`, `caption`, `media_type` (`image \| video`), `media_url`, `thumbnail_url`, `duration_ms`, `link_url`, `link_text`, `is_active`, `display_order`, `starts_at`, `expires_at`, `views_count`, `completions_count`, `clicks_count`, `cart_conversions_count`, `metadata` |
| `StoryHotspot` | `mps_story_hotspot` | `shsp_` | `id`, `story_id`, `product_id`, `variant_id`, `product_title`, `product_handle`, `product_thumbnail`, `price_formatted`, `price_amount`, `currency_code`, `x_percent`, `y_percent`, `label`, `badge_style` (`pill \| card \| dot`) |
| `StorySticker` | `mps_story_sticker` | `sstk_` | `id`, `story_id`, `type` (`poll \| countdown \| coupon \| question_badge`), `prompt`, `x_percent`, `y_percent`, `options`, `coupon_code`, `countdown_until`, `total_interactions`, `metadata` |
| `StoryEvent` | `mps_story_event` | `sevt_` | `id`, `story_id`, `group_id`, `event_type` (`impression \| complete \| tap_forward \| tap_back \| exit \| hotspot_click \| link_click \| add_to_cart \| sticker_interact`), `hotspot_id`, `sticker_id`, `product_id`, `session_id`, `metadata` |

---

## Workflows

| Workflow ID | Export | Compensation | Trigger |
|---|---|---|---|
| `create-story-group` | `createStoryGroupWorkflow` | Deletes created `StoryGroup` | `POST /admin/stories/groups` |
| `create-story-slide` | `createStorySlideWorkflow` | Deletes created `Story` slide (and its hotspots/stickers) | `POST /admin/stories` |
| `record-story-engagement` | `recordStoryEngagementWorkflow` | — | `POST /store/stories/:id/events` |
| `expire-ephemeral-stories` | `expireEphemeralStoriesWorkflow` (alias `expireStoriesWorkflow`) | — | Scheduled job `expire-ephemeral-stories` |

---

## Scheduled Jobs & Subscribers

| Type | File | Trigger / Schedule | Behavior |
|---|---|---|---|
| **Job** | `src/jobs/expire-ephemeral-stories.ts` | `*/15 * * * *` (Every 15 minutes) | Calls `storiesService.expireOutdatedStories()` to deactivate slides whose `expires_at` is in the past |
| **Subscriber** | `src/subscribers/product-deleted.ts` | `product.deleted` | Calls `storiesService.removeHotspotsByProductId(data.id)` so deleted products are removed from story slides |

---

## REST API

### Storefront Endpoints (`/store/stories/*`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/store/stories` | Lists active, non-expired Story Highlight Rings (`groups`) and slides (`stories`). Query params: `placement`, `target_entity_id`, `collection_id`, `group_id`, `product_id`. |
| `POST` | `/store/stories/:id/events` | Records `impression`, `complete`, `tap_forward`, `tap_back`, `exit`, `hotspot_click`, `link_click`, `add_to_cart`, or `sticker_interact` and increments funnel counters. |
| `POST` | `/store/stories/:id/interact` | Votes on a `poll` sticker (`option_id`), submits a `question_badge` answer (`answer_text`), or claims a `coupon` sticker. |

### Admin Endpoints (`/admin/stories/*`)

| Method | Path | Description |
|---|---|---|
| `GET` / `POST` | `/admin/stories` | List full studio state (`stories` + `groups`, optional `?product_id=...`) or create a 9:16 story slide (`createStorySlideWorkflow`). |
| `GET` / `PATCH` / `DELETE` | `/admin/stories/:id` | Retrieve, update, or delete a story slide. |
| `GET` / `POST` | `/admin/stories/groups` | List or create Story Highlight Rings (`createStoryGroupWorkflow`). |
| `GET` / `PATCH` / `DELETE` | `/admin/stories/groups/:id` | Retrieve, update, or delete a Story Highlight Ring. |
| `POST` / `DELETE` | `/admin/stories/:id/hotspots` | Pin a new X/Y product hotspot (`POST`) or remove a hotspot (`DELETE`). |
| `POST` / `DELETE` | `/admin/stories/:id/stickers` | Attach an interactive sticker (`POST`) or remove a sticker (`DELETE`). |
| `GET` | `/admin/stories/analytics` | Retrieve conversion funnel analytics (`total_impressions`, `total_completions`, `total_hotspot_clicks`, `total_add_to_cart`, `overall_completion_rate_pct`, `overall_ctr_pct`, `overall_conversion_rate_pct`, and per-slide breakdown). |

---

## Admin UI & Widgets

All Admin routes, components, and hooks in `src/admin/` are decoupled into focused files (`< 170` lines per file):

| Route / Zone | File | Description |
|---|---|---|
| `/stories` | `src/admin/routes/stories/page.tsx` | Overview dashboard with KPI `StatCard`s and `NavigationCard`s |
| `/stories/canvas` | `src/admin/routes/stories/canvas/page.tsx` | Interactive 9:16 Visual Canvas & X/Y Product Hotspot Tagger |
| `/stories/rings` | `src/admin/routes/stories/rings/page.tsx` | Story Highlight Rings (`StoryGroup`) preview & table |
| `/stories/rings/create` | `src/admin/routes/stories/rings/@create/page.tsx` | Focus modal to create a new Story Highlight Ring |
| `/stories/stickers` | `src/admin/routes/stories/stickers/page.tsx` | Interactive Stickers Builder (Polls, Countdowns, Coupons, Q&A) |
| `/stories/analytics` | `src/admin/routes/stories/analytics/page.tsx` | Conversion Funnel Analytics & per-slide performance table |
| `product.details.after` | `src/admin/widgets/product-stories-widget.tsx` | Product detail widget showing tagged slides and 1-click story creation |

---

## Storefront SDK, Hooks & UI Kit

```tsx
import { useState } from "react"
import {
  StoryRingsBar,
  StoryPlayerModal,
  useStoreStories,
} from "@vicacha-devs/medusa-plugin-stories"

export function StorefrontHeroStories() {
  const { data } = useStoreStories({ placement: "home" })
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)

  const groups = data?.groups ?? []

  return (
    <>
      <StoryRingsBar
        groups={groups}
        activeGroupId={
          activeGroupIndex !== null ? groups[activeGroupIndex]?.id : null
        }
        onSelectGroup={(_group, index) => setActiveGroupIndex(index)}
      />

      <StoryPlayerModal
        groups={groups}
        initialGroupIndex={activeGroupIndex ?? 0}
        isOpen={activeGroupIndex !== null}
        onClose={() => setActiveGroupIndex(null)}
        onAddToCart={(hotspot) => {
          console.log("Add to Medusa cart:", hotspot.product_id, hotspot.variant_id)
        }}
      />
    </>
  )
}
```

---

## Development

```bash
# Typecheck
pnpm typecheck

# Lint (@medusajs/eslint-plugin)
pnpm lint

# Run unit & integration test suite
pnpm test

# Build plugin
pnpm build
```

---

## License

MIT — see [LICENSE](./LICENSE).
