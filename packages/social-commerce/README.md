# `@vicacha-devs/medusa-plugin-social-commerce`

Unified **Social Commerce, Ephemeral 24h Stories, Live Selling & Outbound Catalog Sync** plugin for **Medusa v2 (`2.21.x`)**.

Extends and unifies the capabilities of `@bambiste/medusa-social-commerce` and `@bambiste/medusa-stories` across **TikTok / TikTok Shop**, **Instagram**, **Facebook (Meta Graph API)**, and **Local On-Site Stories**:

- **Multi-Network OAuth 2.0 + PKCE S256 & AES-256-GCM Token Vault** — Connect TikTok, Instagram Professional, and Facebook Pages with signed CSRF state tokens, PKCE S256 challenges, automatic token refresh, and AES-256-GCM encrypted credentials at rest.
- **Unified Shoppable Media & Ephemeral 24h Stories** — Ingest TikTok Videos, Instagram Reels/Stories, Facebook Videos/Stories, and publish manual on-site 24-hour shoppable stories (`platform: "local"`, full superset of `@bambiste/medusa-stories`).
- **Product & Variant Hotspot Tagging** — Tag Medusa products and variants onto videos, reels, images, carousels, and stories with spatial coordinates (`position_x`, `position_y` `0–100%`) and video timeline timestamps (`timestamp_seconds`).
- **Live Selling & Atomic Flash-Sale Stock Reservations** — Schedule and run live shopping streams with dual-mode atomic stock reservations (Redis Lua script mode + zero-dependency in-memory mutex/TTL fallback) and automatic release/confirmation on `order.placed`.
- **Outbound Product Catalog Sync & Hosted Feeds** — Push product batches directly to Meta Commerce Manager (`items_batch`) and TikTok Shop, or serve public hosted feeds (`GET /store/social/catalog-feed?format=xml|csv|json`).
- **Social Checkout Handoff** — Deep-link customers from TikTok, Instagram, or Facebook directly into a pre-filled Medusa cart/checkout (`GET` / `POST /store/social/checkout-handoff?products=variant_1:1,variant_2:2&coupon=LIVE10`) with UTM attribution and live stock reservation holds.
- **Decoupled Admin UI & Widgets** — Full Medusa Admin Studio under `/app/social-commerce` (Overview, Accounts, Feed, 24h Stories, Live Selling, Outbound Catalog) plus a `product.details.after` widget (`< 170` lines per file) localized across 10 languages (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar`).

> **Medusa compatibility:** `2.21.x` — keep peer dependencies aligned with your host application.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation & Configuration](#installation--configuration)
- [Architecture](#architecture)
- [Module, Models & Services](#module-models--services)
- [Providers](#providers)
- [Workflows](#workflows)
- [Scheduled Jobs & Subscribers](#scheduled-jobs--subscribers)
- [REST API & Webhooks](#rest-api--webhooks)
- [Admin UI & Widgets](#admin-ui--widgets)
- [SDK & Headless Storefront Hooks](#sdk--headless-storefront-hooks)
- [Development](#development)
- [License](#license)

---

## Features

- **OAuth 2.0 + PKCE S256 & Encrypted Token Storage** — Generates signed OAuth state payloads, verifies PKCE S256 challenges, encrypts `access_token` and `refresh_token` with AES-256-GCM (`src/modules/social-commerce/utils/security.ts`), and refreshes expiring tokens every 30 minutes.
- **Shoppable Social Feed & 24h Stories** — Syncs remote posts/reels/stories from TikTok and Meta Graph APIs or publishes manual local 24h stories with swipe-up CTA links and product hotspots.
- **Live Shopping Flash-Sale Inventory Protection** — `InventoryReservationService` prevents overselling during live streams using a Redis Lua script (when a Redis client is configured) or an in-memory mutex with automatic 5-minute TTL expiration cleanup.
- **Multi-Format Catalog Feeds & Incremental Checksum Sync** — `CatalogFeedService` renders Google/Meta RSS 2.0 XML (`g:*` namespace), CSV (with formula-injection escaping), and JSON feeds, and tracks SHA-256 item checksums in `CatalogSyncItem` to push only changed variants.
- **HMAC-SHA256 Webhook Verification** — `POST /webhooks/social/:platform` validates TikTok (`x-tts-signature` / `x-tiktok-signature`) and Meta (`x-hub-signature-256`) webhook payloads using constant-time `crypto.timingSafeEqual`.

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
pnpm add @vicacha-devs/medusa-plugin-social-commerce
```

Register the plugin in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-social-commerce",
      options: {},
    },
  ],
})
```

Run database migrations to create the 6 module tables:

```bash
npx medusa db:migrate
```

---

## Architecture

```text
Medusa v2 Host Application
  ├── Module: social_commerce (SocialCommerceService)
  │     ├─ Models: SocialAccount, SocialMediaPost, SocialProductTag, LiveSession, LiveProduct, CatalogSyncItem
  │     ├─ Sub-services: InventoryReservationService (Redis Lua / In-Memory TTL), CatalogFeedService (XML/CSV/JSON)
  │     └─ Providers: TikTokProvider (TikTok Display + Shop API v2), MetaGraphProvider (Instagram + Facebook Graph API v21.0)
  ├── Workflows: account-connected, media-synced, live-started, live-ended, catalog-sync, checkout-handoff
  ├── Jobs: social-commerce-sync-media-and-tokens (*/30m), social-commerce-cleanup-expired-reservations (*/5m)
  ├── Subscribers: order.placed, product.created / product.updated, social.* events
  └── Admin UI (/social-commerce/*) + Product Widget (product.details.after)
```

---

## Module, Models & Services

**Module Token:** `SOCIAL_COMMERCE_MODULE = "social_commerce"`  
**Primary Service:** `SocialCommerceService` (`src/modules/social-commerce/services/social-commerce.service.ts`)

| Model | Table Name | Key Columns |
|---|---|---|
| `SocialAccount` | `social_account` | `id`, `merchant_id`, `platform` (`tiktok \| instagram \| facebook`), `external_id`, `username`, `avatar_url`, `encrypted_access_token`, `encrypted_refresh_token`, `token_scope`, `expires_at`, `follower_count`, `catalog_id`, `is_active`, `metadata` |
| `SocialMediaPost` | `social_media_post` | `id`, `social_account_id`, `platform` (`tiktok \| instagram \| facebook \| local`), `media_type` (`video \| reel \| story \| image \| carousel`), `external_id`, `title`, `caption`, `media_url`, `thumbnail_url`, `embed_link`, `permalink`, `link_url`, `link_text`, `duration_seconds`, `display_order`, `is_featured`, `metrics`, `status` (`active \| expired \| deleted \| private`), `published_at`, `expires_at`, `metadata` |
| `SocialProductTag` | `social_product_tag` | `id`, `social_post_id`, `product_id`, `variant_id`, `timestamp_seconds`, `position_x`, `position_y`, `label`, `display_order` |
| `LiveSession` | `live_session` | `id`, `social_account_id`, `platform`, `external_id`, `title`, `stream_url`, `status` (`scheduled \| live \| ended`), `started_at`, `ended_at`, `viewer_count`, `peak_viewer_count`, `metrics`, `metadata` |
| `LiveProduct` | `live_product` | `id`, `live_session_id`, `product_id`, `variant_id`, `live_price`, `allocated_stock`, `reserved_stock`, `sold_stock`, `is_featured`, `display_order` |
| `CatalogSyncItem` | `catalog_sync_item` | `id`, `social_account_id`, `platform`, `catalog_id`, `medusa_product_id`, `medusa_variant_id`, `external_item_id`, `sync_status` (`synced \| pending \| failed`), `checksum`, `last_synced_at`, `error_message` |

---

## Providers

| Provider | File | Capabilities |
|---|---|---|
| `TikTokProvider` | `src/modules/social-commerce/providers/tiktok.provider.ts` | OAuth 2.0 + PKCE S256 (`https://www.tiktok.com/v2/auth/authorize/`), token exchange & refresh, profile & video listing (`open.tiktokapis.com/v2`), TikTok Shop catalog batch push, and HMAC-SHA256 webhook verification |
| `MetaGraphProvider` | `src/modules/social-commerce/providers/meta-graph.provider.ts` | Instagram Professional & Facebook Page OAuth (`facebook.com/v21.0/dialog/oauth`), short-to-long-lived token exchange & refresh, media/reels/stories/live video ingestion (`graph.facebook.com/v21.0`), Meta Commerce Manager `items_batch` push, and `sha256=` webhook verification |

---

## Workflows

| Workflow ID | File | Description |
|---|---|---|
| `account-connected` | `src/workflows/account-connected.workflow.ts` | Runs initial media & story sync after connecting a social account |
| `media-synced` | `src/workflows/media-synced.workflow.ts` | Syncs posts, reels, and stories for a single account or all active accounts |
| `live-started` | `src/workflows/live-started.workflow.ts` | Transitions a `LiveSession` to `live` (with compensation that ends the session on rollback) |
| `live-ended` | `src/workflows/live-ended.workflow.ts` | Ends a `LiveSession` and releases any unconfirmed stock reservations |
| `catalog-sync` | `src/workflows/catalog-sync.workflow.ts` | Pushes a batch of Medusa products/variants to Meta Commerce Manager or TikTok Shop |
| `checkout-handoff` | `src/workflows/checkout-handoff.workflow.ts` | Builds a pre-filled social checkout handoff payload with optional live flash-sale stock reservation holds and UTM attribution |

---

## Scheduled Jobs & Subscribers

### Scheduled Jobs (`src/jobs/`)

| Job Name | Schedule | File | Description |
|---|---|---|---|
| `social-commerce-sync-media-and-tokens` | `0 */30 * * * *` (Every 30m) | `sync-social-media-and-tokens.job.ts` | Refreshes OAuth tokens expiring within 60 minutes and syncs media posts & 24h stories across all active accounts |
| `social-commerce-cleanup-expired-reservations` | `0 */5 * * * *` (Every 5m) | `cleanup-reservations-and-sync-catalog.job.ts` | Reclaims expired live-stream stock reservations (`status: "held"` past TTL) |

### Event Subscribers (`src/subscribers/`)

| File | Events | Description |
|---|---|---|
| `order-placed.subscriber.ts` | `order.placed` | Confirms held live-stream stock reservations matching `order.metadata.reservation_id`, `order.metadata.live_reservation_ids`, or `cart_id` |
| `product-sync.subscriber.ts` | `product.created`, `product.updated` | Automatically syncs updated catalog items to active social accounts with a configured `external_catalog_id` or `external_shop_id` |
| `social-events.subscriber.ts` | `social.account_connected`, `social.media_synced`, `social.live_started`, `social.live_ended` | Dispatches `accountConnectedWorkflow`, `liveStartedWorkflow`, and `liveEndedWorkflow` in response to domain/webhook events |

---

## REST API & Webhooks

### Storefront Endpoints (`/store/social/*`)

| Method | Path | Description |
|---|---|---|
| `GET` | `/store/social/feed` | Paginated shoppable feed (`posts`, `reels`, `stories`, `images`, `carousels`) with tagged products. Query: `platform`, `media_type`, `product_id`, `is_featured`, `include_expired`, `limit`, `offset`. |
| `GET` | `/store/social/stories` | Active non-expired 24h stories (both synced IG/FB stories and local on-site stories). Query: `platform`, `product_id`, `limit`, `offset`. |
| `GET` | `/store/social/posts/:id` | Retrieve a single social media post with its ordered `SocialProductTag` hotspots. |
| `GET` | `/store/social/live` | List active (`live`) and `scheduled` live shopping streams with pinned `LiveProduct` inventory & flash-sale pricing. |
| `GET` | `/store/social/catalog-feed` | Hosted product feed for Google Merchant Center, Meta Commerce Manager & TikTok Shop scheduled pulls (`?format=xml\|csv\|json&currency_code=EUR&country_code=DE&region_id=...&sales_channel_id=...&token=...`). Emits `<g:gtin>`, `<g:mpn>`, `<g:additional_image_link>`, `<g:color>`, `<g:size>`, `<g:material>`, dynamic `<g:*>` variant option tags, and supports optional `feed_token` protection + `before_feed_item` transform/filter hook. |
| `GET` / `POST` | `/store/social/checkout-handoff` | Creates a social checkout handoff (`?products=variant_1:1,variant_2:2&platform=tiktok&live_session_id=...&coupon=LIVE10&redirect=true`). |

### Admin Endpoints (`/admin/social/*`)

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/social/connect` | Generate OAuth 2.0 + PKCE S256 authorization URL or complete manual token exchange. |
| `GET` | `/admin/social/accounts` | List connected social accounts (tokens masked). |
| `GET` / `PATCH` / `DELETE` | `/admin/social/accounts/:id` | Retrieve, update (`is_active`, `catalog_id`), or disconnect a social account. |
| `POST` | `/admin/social/sync` | Trigger manual media & stories sync (`mediaSyncedWorkflow`). |
| `GET` / `POST` | `/admin/social/posts` | List all social posts/stories or publish a manual on-site 24h story (`publishLocalStory`). |
| `GET` / `PATCH` / `DELETE` | `/admin/social/posts/:id` | Retrieve, update (`modifyMediaPost`), or delete (`purgeMediaPost`) a post/story. |
| `GET` / `POST` / `DELETE` | `/admin/social/posts/:id/products` | List, tag (`tagProductsOnPost`), or untag (`untagProductFromPost`) product/variant hotspots on a post. |
| `GET` / `POST` | `/admin/social/live` | List live sessions or schedule/start a new live session (`scheduleLiveSession`). |
| `GET` / `POST` | `/admin/social/live/:id` | Retrieve a live session or transition its state (`action: "start" \| "end" \| "reserve"`). |
| `GET` / `POST` | `/admin/social/live/:id/products` | List or pin (`pinProductsToLiveSession`) flash-sale variants and stock allocations to a live session. |
| `GET` / `POST` | `/admin/social/catalog` | List `CatalogSyncItem` statuses or trigger `catalogSyncWorkflow` / render a feed preview. |

### OAuth Callback & Webhooks

| Method | Path | Description |
|---|---|---|
| `GET` / `POST` | `/social/oauth/callback` | Handles OAuth 2.0 callback, verifies state & PKCE S256, stores encrypted tokens, and triggers `accountConnectedWorkflow`. |
| `GET` / `POST` | `/webhooks/social/:platform` | Handles Meta `hub.challenge` verification (`GET`) and HMAC-SHA256 verified webhook events (`POST`) for `tiktok`, `instagram`, and `facebook`. |

---

## Admin UI & Widgets

All Admin UI files in `src/admin/` are decoupled into focused modules (`< 170` lines per file):

| Route / Zone | File | Description |
|---|---|---|
| `/social-commerce` | `src/admin/routes/social-commerce/page.tsx` | Overview dashboard with platform filter, KPI `StatCard`s, and `NavigationCard`s |
| `/social-commerce/accounts` | `src/admin/routes/social-commerce/accounts/page.tsx` | Connected OAuth accounts manager (TikTok, Instagram, Facebook) |
| `/social-commerce/feed` | `src/admin/routes/social-commerce/feed/page.tsx` | Shoppable feed grid & product hotspot tagger |
| `/social-commerce/stories` | `src/admin/routes/social-commerce/stories/page.tsx` | Ephemeral 24h stories table & status manager |
| `/social-commerce/stories/create` | `src/admin/routes/social-commerce/stories/@create/page.tsx` | Focus modal to publish a new 24h shoppable story |
| `/social-commerce/live` | `src/admin/routes/social-commerce/live/page.tsx` | Live shopping sessions table with start/end controls & stock reservations |
| `/social-commerce/live/create` | `src/admin/routes/social-commerce/live/@create/page.tsx` | Focus modal to schedule a live stream |
| `/social-commerce/catalog` | `src/admin/routes/social-commerce/catalog/page.tsx` | Outbound catalog sync status table & XML/CSV/JSON feed URLs |
| `product.details.after` | `src/admin/widgets/product-social-widget.tsx` | Product detail widget showing tagged posts/stories & catalog sync status |

---

## SDK & Headless Storefront Hooks

```ts
import { createSocialCommerceSDK } from "@vicacha-devs/medusa-plugin-social-commerce/sdk"
import { createSocialCommerceHooks } from "@vicacha-devs/medusa-plugin-social-commerce/hooks"

const sdk = createSocialCommerceSDK({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL!,
  publishableApiKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

const socialHooks = createSocialCommerceHooks(sdk)
```

---

## Development

```bash
# Run @medusajs/eslint-plugin linter
pnpm lint

# Run TypeScript typechecker
pnpm typecheck

# Run unit & integration test suite
pnpm test

# Build plugin
pnpm build
```

---

## License

MIT — see [LICENSE](./LICENSE).
