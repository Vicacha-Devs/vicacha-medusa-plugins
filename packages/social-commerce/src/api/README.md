# API Routes

File-based REST routes under `/admin`, `/store`, `/social`, and `/webhooks`, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```
api/
├── validators.ts                           Zod schemas (@medusajs/framework/zod) for all Admin, Store & OAuth routes
├── middlewares.ts                          defineMiddlewares binding validateAndTransformBody
├── admin/
│   ├── plugin/
│   │   └── route.ts                        GET /admin/plugin — health check
│   └── social/
│       ├── connect/
│       │   └── route.ts                    POST /admin/social/connect — generate OAuth PKCE URL or exchange code
│       ├── accounts/
│       │   ├── route.ts                    GET /admin/social/accounts — list connected accounts
│       │   └── [id]/
│       │       └── route.ts                GET, PATCH, DELETE /admin/social/accounts/:id
│       ├── sync/
│       │   └── route.ts                    POST /admin/social/sync — trigger mediaSyncedWorkflow
│       ├── posts/
│       │   ├── route.ts                    GET, POST /admin/social/posts — list posts or publish local 24h story
│       │   └── [id]/
│       │       ├── route.ts                GET, PATCH, DELETE /admin/social/posts/:id
│       │       └── products/
│       │           └── route.ts            GET, POST, DELETE /admin/social/posts/:id/products — tag/untag hotspots
│       ├── live/
│       │   ├── route.ts                    GET, POST /admin/social/live — list or schedule live sessions
│       │   └── [id]/
│       │       ├── route.ts                GET, POST /admin/social/live/:id — start, end, or reserve live stock
│       │       └── products/
│       │           └── route.ts            GET, POST /admin/social/live/:id/products — pin flash-sale variants
│       └── catalog/
│           └── route.ts                    GET, POST /admin/social/catalog — list sync items or run catalogSyncWorkflow
├── social/
│   └── oauth/
│       └── callback/
│           └── route.ts                    GET, POST /social/oauth/callback — OAuth 2.0 + PKCE callback
├── store/
│   ├── plugin/
│   │   └── route.ts                        GET /store/plugin — storefront health check
│   └── social/
│       ├── feed/
│       │   └── route.ts                    GET /store/social/feed — paginated shoppable posts, reels & stories
│       ├── stories/
│       │   └── route.ts                    GET /store/social/stories — active 24h shoppable stories
│       ├── posts/
│       │   └── [id]/
│       │       └── route.ts                GET /store/social/posts/:id — post detail with product hotspots
│       ├── live/
│       │   └── route.ts                    GET /store/social/live — active & scheduled live streams with pinned products
│       ├── catalog-feed/
│       │   └── route.ts                    GET /store/social/catalog-feed — XML (RSS 2.0), CSV, or JSON catalog feed
│       └── checkout-handoff/
│           └── route.ts                    GET, POST /store/social/checkout-handoff — pre-filled checkout deep-link
└── webhooks/
    └── social/
        └── [platform]/
            └── route.ts                    GET (challenge), POST (HMAC-SHA256 verified) /webhooks/social/:platform
```

---

## Route & Validation Conventions

- All request body validation schemas are defined in `src/api/validators.ts` using `z` from `@medusajs/framework/zod` and bound in `src/api/middlewares.ts` via `defineMiddlewares` and `validateAndTransformBody`.
- Route handlers never call `create*`, `update*`, or `delete*` service methods directly; they invoke Medusa workflows (`accountConnectedWorkflow`, `mediaSyncedWorkflow`, `liveStartedWorkflow`, `liveEndedWorkflow`, `catalogSyncWorkflow`, `checkoutHandoffWorkflow`) or domain methods on `SocialCommerceService`.
- Webhook requests (`POST /webhooks/social/:platform`) verify `x-tts-signature` / `x-tiktok-signature` (TikTok) and `x-hub-signature-256` (Meta) using constant-time HMAC-SHA256 comparison (`verifyHmacSha256Signature`).
