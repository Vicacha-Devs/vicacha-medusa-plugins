# CLAUDE.md — `@vicacha-devs/medusa-plugin-social-commerce`

## Project Overview

`@vicacha-devs/medusa-plugin-social-commerce` is a Medusa v2 (`2.21.x`) plugin providing multi-network Social Commerce (TikTok / TikTok Shop, Instagram Professional, Facebook / Meta Graph API, and Local On-Site 24h Stories), OAuth 2.0 + PKCE S256 with AES-256-GCM encrypted token storage, Product & Variant Hotspot Tagging, Live Selling with atomic flash-sale stock reservations (Redis Lua + in-memory TTL fallback), Outbound Product Catalog Sync (Meta `items_batch`, TikTok Shop, and XML/CSV/JSON hosted feeds), and Social Checkout Handoff.

---

## Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
|---|---|---|
| `@vicacha-devs/medusa-plugin-social-commerce` | `src/index.ts` | Root export (module, service, models, providers, workflows, validators, SDK, hooks, i18n) |
| `@vicacha-devs/medusa-plugin-social-commerce/modules/social-commerce` | `src/modules/social-commerce/index.ts` | Medusa Module definition (`SOCIAL_COMMERCE_MODULE = "social_commerce"`) |
| `@vicacha-devs/medusa-plugin-social-commerce/workflows` | `src/workflows/index.ts` | `accountConnectedWorkflow`, `mediaSyncedWorkflow`, `liveStartedWorkflow`, `liveEndedWorkflow`, `catalogSyncWorkflow`, `checkoutHandoffWorkflow` |
| `@vicacha-devs/medusa-plugin-social-commerce/sdk` | `src/sdk/index.ts` | `createSocialCommerceSDK`, `SocialCommerceSDKClient` |
| `@vicacha-devs/medusa-plugin-social-commerce/hooks` | `src/hooks/index.ts` | `createSocialCommerceHooks`, `SOCIAL_COMMERCE_QUERY_KEYS` |
| `@vicacha-devs/medusa-plugin-social-commerce/types` | `src/types/index.ts` | Shared TypeScript types |

---

## Directory Structure

```text
medusa-plugin-social-commerce/
├── src/
│   ├── index.ts                                  # Root barrel export
│   ├── loaders/
│   │   └── register.ts                           # Module startup loader
│   ├── modules/social-commerce/
│   │   ├── index.ts                              # Module("social_commerce", { service: SocialCommerceService })
│   │   ├── migrations/
│   │   │   └── Migration20261013000000.ts        # Database migration for social_commerce tables
│   │   ├── models/
│   │   │   ├── index.ts
│   │   │   ├── social-account.ts                 # social_account model
│   │   │   ├── social-media-post.ts              # social_media_post model
│   │   │   ├── social-product-tag.ts             # social_product_tag model
│   │   │   ├── live-session.ts                   # live_session model
│   │   │   ├── live-product.ts                   # live_product model
│   │   │   └── catalog-sync-item.ts              # catalog_sync_item model
│   │   ├── providers/
│   │   │   ├── index.ts
│   │   │   ├── tiktok.provider.ts                # TikTokProvider (OAuth PKCE, Display API, Shop Catalog, Webhooks)
│   │   │   └── meta-graph.provider.ts            # MetaGraphProvider (Instagram + Facebook Graph API v21.0, Catalog Batch, Webhooks)
│   │   ├── services/
│   │   │   ├── social-commerce.service.ts        # Primary MedusaService implementation
│   │   │   ├── inventory-reservation.service.ts  # Dual-mode Redis Lua + in-memory mutex/TTL flash-sale stock reservations
│   │   │   └── catalog-feed.service.ts           # XML (RSS 2.0 g:*), CSV (formula-safe), and JSON catalog feed generator
│   │   ├── types/
│   │   │   └── index.ts                          # All domain DTOs, input/output types, and provider interfaces
│   │   └── utils/
│   │       ├── medusa-error.ts                   # MedusaError helper
│   │       └── security.ts                       # AES-256-GCM encryption, PKCE S256, OAuth state signing, HMAC-SHA256, URL/redirect validation
│   ├── workflows/
│   │   ├── index.ts
│   │   ├── account-connected.workflow.ts         # accountConnectedWorkflow
│   │   ├── media-synced.workflow.ts              # mediaSyncedWorkflow
│   │   ├── live-started.workflow.ts              # liveStartedWorkflow
│   │   ├── live-ended.workflow.ts                # liveEndedWorkflow
│   │   ├── catalog-sync.workflow.ts              # catalogSyncWorkflow
│   │   └── checkout-handoff.workflow.ts          # checkoutHandoffWorkflow
│   ├── jobs/
│   │   ├── sync-social-media-and-tokens.job.ts   # Every 30m: refresh expiring OAuth tokens & sync media/stories
│   │   └── cleanup-reservations-and-sync-catalog.job.ts # Every 5m: reclaim expired live stock reservations
│   ├── subscribers/
│   │   ├── order-placed.subscriber.ts            # Confirms held live stock reservations on order.placed
│   │   ├── product-sync.subscriber.ts            # Syncs product.created / product.updated to connected catalogs
│   │   └── social-events.subscriber.ts           # Handles social.account_connected, social.live_started, social.live_ended
│   ├── api/
│   │   ├── validators.ts                         # Centralized Zod schemas (@medusajs/framework/zod)
│   │   ├── middlewares.ts                        # Route middleware bindings (defineMiddlewares)
│   │   ├── admin/social/                         # Admin endpoints (connect, accounts, sync, posts, live, catalog)
│   │   ├── store/social/                         # Store endpoints (feed, stories, posts/[id], live, catalog-feed, checkout-handoff)
│   │   ├── social/oauth/callback/                # OAuth 2.0 callback handler
│   │   └── webhooks/social/[platform]/           # HMAC-SHA256 verified webhook handler
│   ├── admin/
│   │   ├── components/                           # 14 decoupled presentational components (< 170 lines each)
│   │   ├── hooks/                                # useSocialDashboard & useProductSocialStatus
│   │   ├── i18n/                                 # 10 locales (en, es, fr, de, it, pt, nl, pl, tr, ar)
│   │   ├── routes/social-commerce/               # Overview, accounts, feed, stories (+ @create), live (+ @create), catalog
│   │   ├── utils/formatters.ts                   # Safe external URL check & platform badge helpers
│   │   └── widgets/product-social-widget.tsx     # product.details.after widget
│   ├── sdk/                                      # Typed Storefront & Admin SDK client
│   ├── hooks/                                    # Headless Storefront query & mutation descriptors
│   └── __tests__/
│       ├── register-ts-resolver.mjs
│       ├── medusa-shim.mjs
│       ├── medusa-http-shim.mjs
│       └── social-commerce.spec.ts
├── package.json
└── tsconfig.json
```

---

## Core Architectural & Lint Rules

1. **Use `MedusaError` Everywhere**:
   - Always import `MedusaError` from `@medusajs/framework/utils` (or `src/modules/social-commerce/utils/medusa-error.ts`) and throw `new MedusaError(MedusaError.Types.*, message)` instead of generic `new Error(...)`.
2. **Comply 100% with `@medusajs/eslint-plugin`**:
   - Import `z` from `@medusajs/framework/zod` (never directly from `"zod"`).
   - Keep all Zod request validators in `src/api/validators.ts` and wire them in `src/api/middlewares.ts` via `defineMiddlewares` and `validateAndTransformBody`.
   - Do not call mutation-named service methods (`create*`, `update*`, `delete*`) directly inside `src/api/**/route.ts`; use workflows or domain methods (`publishLocalStory`, `modifyMediaPost`, `purgeMediaPost`, `scheduleLiveSession`, `pinProductsToLiveSession`, `renderCatalogFeed`).
3. **Decouple Admin Pages and Widgets (`< 170` lines per file)**:
   - Keep `src/admin/routes/social-commerce/**/page.tsx` and `src/admin/widgets/product-social-widget.tsx` thin entrypoints using `LayoutComposer`, arrow functions (`const Page = () => ...`), and `defineRouteConfig` / `defineWidgetConfig` from `@medusajs/admin-sdk`.
   - Place complex UI tabs, tables, forms, and custom hooks in `src/admin/components/`, `src/admin/hooks/`, and `src/admin/utils/`.
   - Never import `@medusajs/framework/utils` or use `process.env` inside `src/admin/**`.

---

## Verification Commands

- `npm run lint` — Must exit with 0 errors and 0 warnings.
- `npm run typecheck` — Must exit with 0 TypeScript errors.
- `npm test` — Runs the unit and integration test suite.
- `npm run build` — Compiles server and admin bundles and resolves path aliases.
