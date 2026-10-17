# API Routes

File-based REST routes under `/admin/typesense/*` and `/store/typesense/*`, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```
api/
├── validators.ts                                           Zod schemas (@medusajs/framework/zod) for all Admin & Store routes
├── middlewares.ts                                          Storefront sales-channel scoping, graph hydration & validation bindings
├── admin/
│   ├── plugin/
│   │   └── route.ts                                        GET /admin/plugin — health check
│   └── typesense/
│       ├── health/
│       │   └── route.ts                                    GET /admin/typesense/health — cluster status, collections & sync jobs
│       ├── collections/
│       │   ├── route.ts                                    GET (list collections), POST (reindex all) /admin/typesense/collections
│       │   └── [entity]/
│       │       └── sync/
│       │           └── route.ts                            POST /admin/typesense/collections/:entity/sync
│       ├── entities/
│       │   ├── route.ts                                    GET (list configs), POST (register/update entity) /admin/typesense/entities
│       │   └── [entity]/
│       │       └── route.ts                                DELETE /admin/typesense/entities/:entity
│       ├── synonyms/
│       │   └── [entity]/
│       │       ├── route.ts                                GET, POST /admin/typesense/synonyms/:entity
│       │       └── [id]/
│       │           └── route.ts                            DELETE /admin/typesense/synonyms/:entity/:id
│       ├── curations/
│       │   └── [entity]/
│       │       ├── route.ts                                GET, POST /admin/typesense/curations/:entity
│       │       └── [id]/
│       │           └── route.ts                            DELETE /admin/typesense/curations/:entity/:id
│       ├── stopwords/
│       │   ├── route.ts                                    GET, POST /admin/typesense/stopwords
│       │   └── [id]/
│       │       └── route.ts                                DELETE /admin/typesense/stopwords/:id
│       ├── playground/
│       │   └── route.ts                                    POST /admin/typesense/playground — Admin Search Playground
│       ├── analytics/
│       │   └── route.ts                                    GET /admin/typesense/analytics — popular queries, zero-result queries & CTR
│       └── documents/
│           └── [entity]/
│               └── [id]/
│                   └── route.ts                            GET (inspect doc), POST (re-sync doc), DELETE (remove doc)
└── store/
    ├── plugin/
    │   └── route.ts                                        GET /store/plugin — storefront health check
    └── typesense/
        ├── products/
        │   └── route.ts                                    GET, POST /store/typesense/products — hydrated product search
        ├── categories/
        │   └── route.ts                                    GET, POST /store/typesense/categories — hydrated category search
        ├── collections/
        │   └── route.ts                                    GET, POST /store/typesense/collections — hydrated collection search
        ├── search/
        │   └── route.ts                                    POST /store/typesense/search — federated multi-entity search
        ├── token/
        │   └── route.ts                                    GET /store/typesense/token — HMAC-signed Scoped InstantSearch key
        ├── chat/
        │   └── route.ts                                    POST /store/typesense/chat — conversational RAG search
        └── analytics/
            └── route.ts                                    POST /store/typesense/analytics — click & conversion event tracking
```

---

## Endpoint Summary

### Storefront Endpoints (`/store/typesense/*`)

All storefront routes resolve the publishable API key's `sales_channel_ids` and enforce `status:=published` (or the entity's `storefrontFilterConstraint`) via `compileTypesenseFilter`:

| Method | Path | Description |
| --- | --- | --- |
| `GET` / `POST` | `/store/typesense/products` | Searches Typesense (`keyword`, `semantic`, or `hybrid`), supports disjunctive & range facets, and hydrates hits via Medusa `query.graph` with live `calculated_price` and `variants.inventory_quantity`. |
| `GET` / `POST` | `/store/typesense/categories` | Searches `medusa_categories` with `is_active:=true && is_internal:=false` and optional Medusa graph hydration. |
| `GET` / `POST` | `/store/typesense/collections` | Searches `medusa_collections` with optional Medusa graph hydration. |
| `POST` | `/store/typesense/search` | Federated multi-search across `products`, `categories`, `collections`, and custom entities in a single Typesense `multi_search` call. |
| `GET` | `/store/typesense/token` | Generates a short-lived HMAC-signed Typesense Scoped Search-Only API Key with embedded `status:=published` and `sales_channel_ids` constraints for `typesense-instantsearch-adapter`. |
| `POST` | `/store/typesense/chat` | Multi-turn conversational RAG search powered by Typesense Conversation Models. |
| `POST` | `/store/typesense/analytics` | Records storefront `search`, `click`, or `conversion` events into `mpt_search_analytics`. |

### Admin Endpoints (`/admin/typesense/*`)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/typesense/health` | Cluster health, collection alias metrics, and recent `mpt_sync_job` entries. |
| `GET` / `POST` | `/admin/typesense/collections` | List all collections/aliases or trigger zero-downtime reindex across all enabled entities. |
| `POST` | `/admin/typesense/collections/:entity/sync` | Trigger `syncEntitiesToTypesenseWorkflow` (`fullRebuild: true` or incremental `ids: [...]`) for `:entity`. |
| `GET` / `POST` | `/admin/typesense/entities` | List built-in and custom entity index configurations or register/update an entity config. |
| `DELETE` | `/admin/typesense/entities/:entity` | Delete a custom entity configuration (and optionally drop its Typesense collection). |
| `GET` / `POST` / `DELETE` | `/admin/typesense/synonyms/:entity[/:id]` | List, upsert, or delete Multi-way and One-way Synonyms. |
| `GET` / `POST` / `DELETE` | `/admin/typesense/curations/:entity[/:id]` | List, upsert, or delete Curations/Overrides (pinning, hiding, filter/sort injection, promo banners). |
| `GET` / `POST` / `DELETE` | `/admin/typesense/stopwords[/:id]` | List, upsert, or delete Stopwords Sets. |
| `POST` | `/admin/typesense/playground` | Execute Admin Search Playground queries with full telemetry & highlight inspection. |
| `GET` | `/admin/typesense/analytics` | Retrieve popular queries, zero-result queries, CTR, conversion rate & average latency. |
| `GET` / `POST` / `DELETE` | `/admin/typesense/documents/:entity/:id` | Inspect raw indexed JSON document, trigger single-item re-sync (`upsertTypesenseDocumentsWorkflow`), or delete from index (`deleteTypesenseDocumentsWorkflow`). |
