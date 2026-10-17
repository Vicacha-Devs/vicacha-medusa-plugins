# CLAUDE.md — `medusa-plugin-typesense`

## Project Overview

`medusa-plugin-typesense` is a full-featured **Typesense Search, Vector/Hybrid AI Search, Merchandising, and Custom Entity Indexing Plugin for Medusa v2 (`^2.21.0`)**.

It implements a **dual architecture**:
1. **Standalone Typesense Module (`src/modules/typesense`)** with Medusa DML persistence (`mpt_sync_job`, `mpt_entity_config`, `mpt_search_analytics`), workflows (`src/workflows/`), event subscribers (`src/subscribers/`), scheduled jobs (`src/jobs/`), Store & Admin REST routes (`src/api/`), and Admin UI extensions (`src/admin/`).
2. **Native Medusa 2.21 Search Module Provider (`src/providers/typesense`) & Index Factories (`src/indexes/`)** implementing `AbstractSearchProviderService` and `defineSearchIndex` from `@medusajs/framework/utils`.

---

## Package Exports (`package.json`)

| Import Path | Target Source | Purpose |
| :--- | :--- | :--- |
| `medusa-plugin-typesense` | `src/index.ts` | Root export (`TYPESENSE_MODULE`, `TypesenseModuleService`, `TypesenseSearchProviderService`, workflows, index factories, types) |
| `medusa-plugin-typesense/modules/typesense` | `src/modules/typesense/index.ts` | Standalone Medusa module (`Module("typesense", { service: TypesenseModuleService })`) |
| `medusa-plugin-typesense/providers/typesense` | `src/providers/typesense/index.ts` | Medusa 2.21 `@medusajs/medusa/search` provider (`ModuleProvider(Modules.SEARCH, ...)`) |
| `medusa-plugin-typesense/indexes` | `src/indexes/index.ts` | `defineProductSearchIndex`, `defineCategorySearchIndex`, `defineCollectionSearchIndex`, `defineCustomSearchIndex` |
| `medusa-plugin-typesense/workflows` | `src/workflows/index.ts` | `syncEntitiesToTypesenseWorkflow`, `upsertTypesenseDocumentsWorkflow`, `deleteTypesenseDocumentsWorkflow` |

---

## Directory Structure

```text
medusa-plugin-typesense/
├── src/
│   ├── index.ts                                  # Root exports (module, provider, indexes, workflows)
│   ├── modules/typesense/
│   │   ├── index.ts                              # Module("typesense", { service: TypesenseModuleService })
│   │   ├── types.ts                              # All TypeScript interfaces & constants
│   │   ├── service.ts                            # TypesenseModuleService (zero-downtime swaps, search, merchandising)
│   │   ├── models/
│   │   │   ├── sync-job.ts                       # mpt_sync_job DML model
│   │   │   ├── entity-config.ts                  # mpt_entity_config DML model
│   │   │   └── search-analytics.ts               # mpt_search_analytics DML model
│   │   ├── migrations/
│   │   │   └── Migration20260401000000.ts        # Database migration for mpt_* tables
│   │   └── utils/
│   │       ├── schemas.ts                        # Collection schema builder & entity defaults
│   │       ├── transformers.ts                   # Product, Category, Collection & Custom Entity transformers
│   │       └── filter-compiler.ts                # Safe Typesense filter compiler & escaping
│   ├── providers/typesense/
│   │   ├── index.ts                              # ModuleProvider(Modules.SEARCH, ...)
│   │   └── service.ts                            # TypesenseSearchProviderService (Medusa 2.21 contract)
│   ├── indexes/
│   │   └── index.ts                              # defineProductSearchIndex, defineCategorySearchIndex, defineCollectionSearchIndex, defineCustomSearchIndex
│   ├── workflows/
│   │   ├── sync-entities.ts                      # syncEntitiesToTypesenseWorkflow
│   │   ├── upsert-documents.ts                   # upsertTypesenseDocumentsWorkflow
│   │   └── delete-documents.ts                   # deleteTypesenseDocumentsWorkflow
│   ├── subscribers/
│   │   ├── product-sync.ts                       # product.* & product-variant.* events
│   │   ├── category-sync.ts                      # product-category.* events
│   │   └── collection-sync.ts                    # product-collection.* events
│   ├── jobs/
│   │   └── typesense-nightly-reconcile.ts        # Nightly catalog reconciliation cron job
│   ├── api/
│   │   ├── validators.ts                         # Zod request validation schemas & inferred types
│   │   ├── middlewares.ts                        # Storefront sales-channel scoping, graph hydration & security headers
│   │   ├── store/typesense/                      # Storefront endpoints (products, categories, collections, search, token, chat, analytics)
│   │   └── admin/typesense/                      # Admin endpoints (health, collections, entities, synonyms, curations, stopwords, playground, analytics, documents)
│   ├── admin/
│   │   ├── i18n/
│   │   │   ├── index.ts                          # react-i18next resource map for Medusa Admin
│   │   │   └── json/                             # en, es, de, fr, pt, it, nl, pl, tr, ar JSON dictionaries
│   │   ├── components/typesense/
│   │   │   ├── types.ts                          # Shared Admin UI types & SUPPORTED_UI_LOCALES
│   │   │   ├── safe-highlight.tsx                # Safe <mark> highlight JSX renderer
│   │   │   ├── use-typesense-studio.ts           # Studio state & API hook
│   │   │   ├── header-bar.tsx                    # Cluster status & language switcher header
│   │   │   ├── overview-cards.tsx                # Cluster status, active aliases & indexed document summary cards
│   │   │   ├── overview-tab.tsx                  # Collections & sync jobs tab
│   │   │   ├── entities-tab.tsx                  # Custom entity registration & embedder config tab
│   │   │   ├── merchandising-tab.tsx             # Synonyms, Curations & Stopwords tab container
│   │   │   ├── synonyms-section.tsx              # Multi-way & One-way Synonyms management section
│   │   │   ├── curations-section.tsx             # Curations / Overrides management section
│   │   │   ├── stopwords-section.tsx             # Stopwords set management section
│   │   │   ├── playground-tab.tsx                # AI Search Playground controls tab
│   │   │   ├── playground-results-section.tsx    # Search Playground hit cards, highlights & JSON modal
│   │   │   └── analytics-tab.tsx                 # Search Analytics & No-Hit Query tab
│   │   ├── routes/typesense/
│   │   │   ├── page.tsx                          # /app/typesense Unified Studio Dashboard page
│   │   │   ├── collections/page.tsx              # /app/typesense/collections sub-route
│   │   │   ├── entities/page.tsx                 # /app/typesense/entities sub-route
│   │   │   ├── merchandising/page.tsx            # /app/typesense/merchandising sub-route
│   │   │   ├── playground/page.tsx               # /app/typesense/playground sub-route
│   │   │   └── analytics/page.tsx                # /app/typesense/analytics sub-route
│   │   └── widgets/product-typesense-widget.tsx  # product.details.side.after widget
│   └── __tests__/
│       ├── register-ts-resolver.mjs              # Node native test runner TypeScript hook
│       ├── transformers-and-schemas.spec.ts
│       ├── filter-compiler-and-security.spec.ts
│       └── service-and-provider.spec.ts
├── package.json
└── tsconfig.json
```

---

## Commands

- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Test**: `npm test` (`node --import ./src/__tests__/register-ts-resolver.mjs --test src/__tests__/*.spec.ts`)
- **Build**: `npm run build` (`medusa plugin:build`)
- **Dev Watch**: `npm run dev` (`medusa plugin:develop`)

---

## Key Engineering & Security Conventions

1. **Type-Only Imports for Node Test Runner**: Node's built-in TypeScript stripping requires `import type { ... }` for interfaces and type aliases in files imported by tests.
2. **Typesense Filter Injection Prevention**: Always use `escapeTypesenseFilterValue`, `assertSafeTypesenseField`, and `combineTypesenseFilters` in `src/modules/typesense/utils/filter-compiler.ts`. Combined filter segments are parenthesized (`(securityFilter) && (userFilter)`) so user `$or` clauses cannot bypass `status:=published` or `sales_channel_ids`.
3. **Zero-Downtime Alias Swaps**: Full rebuilds create `{alias}_v_{timestamp}`, copy existing synonyms & overrides from the previous physical collection, import documents in batches, atomically point `{alias}` to `{alias}_v_{timestamp}`, and prune older physical collections.
4. **Safe Highlighting in Admin UI**: Never use `dangerouslySetInnerHTML` or `innerHTML`. Parse `<mark>...</mark>` tokens into React JSX elements via `renderSafeHighlight`.
5. **Medusa 2.21 `defineSearchIndex` Compatibility**: `src/indexes/index.ts` imports `@medusajs/framework/modules-sdk` and ensures `globalThis.MedusaModule.setSearchIndex` is initialized so index factories work both inside the Medusa container and in standalone unit test runners.
