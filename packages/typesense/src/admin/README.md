# Admin

Medusa Admin extension — routes, widgets, decoupled studio components, hooks, and 10-locale i18n dictionaries for `@vicacha-devs/medusa-plugin-typesense`.

```sh
admin/
├── tsconfig.json                               TypeScript config for the Admin Vite bundle
├── vite-env.d.ts                               Vite client ambient types
├── i18n/                                       react-i18next setup and 10 locale JSON files
├── components/
│   └── typesense/
│       ├── index.ts                            Barrel export for all Typesense Admin components
│       ├── types.ts                            Shared Admin UI types & SUPPORTED_UI_LOCALES
│       ├── use-typesense-studio.ts             Studio state & API hook for /typesense routes
│       ├── safe-highlight.tsx                  Safe <mark> highlight JSX renderer (no dangerouslySetInnerHTML)
│       ├── header-bar.tsx                      Cluster health indicator, node host/port & language switcher
│       ├── overview-cards.tsx                  StatCard & NavigationCard components
│       ├── overview-tab.tsx                    Collections table, zero-downtime rebuilds & sync job history
│       ├── entities-tab.tsx                    Custom entity registration & vector embedder configuration
│       ├── merchandising-tab.tsx               Container for Synonyms, Curations & Stopwords sections
│       ├── synonyms-section.tsx                Multi-way & One-way Synonyms manager
│       ├── curations-section.tsx               Curations/Overrides (pinned IDs, excluded IDs, promo banners)
│       ├── stopwords-section.tsx               Stopwords Sets manager
│       ├── playground-tab.tsx                  AI Search Playground (Keyword, Semantic & Hybrid alpha slider)
│       ├── playground-results-section.tsx      Search hits, safe highlights, facet counts & raw JSON viewer
│       └── analytics-tab.tsx                   Popular queries, zero-result queries, CTR & conversion metrics
├── routes/
│   └── typesense/                              Page routes registered in the Medusa admin shell
│       ├── page.tsx                            /typesense — overview dashboard
│       ├── collections/
│       │   └── page.tsx                        /typesense/collections — collections & sync jobs
│       ├── entities/
│       │   └── page.tsx                        /typesense/entities — custom entities & embedder config
│       ├── merchandising/
│       │   └── page.tsx                        /typesense/merchandising — synonyms, curations & stopwords
│       ├── playground/
│       │   └── page.tsx                        /typesense/playground — AI search playground
│       └── analytics/
│           └── page.tsx                        /typesense/analytics — search analytics & zero-result queries
└── widgets/
    └── product-typesense-widget.tsx            product.details.side.after widget
```

---

## Route & Widget registration

The top-level `/typesense` page exports a `config` object created with `defineRouteConfig` from `@medusajs/admin-sdk`:

```tsx
export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "typesense",
  icon: MagnifyingGlass,
})
```

`widgets/product-typesense-widget.tsx` registers in the `product.details.side.after` zone using `defineWidgetConfig`.

---

## Data fetching & state hooks

| Hook | File | Purpose |
| --- | --- | --- |
| `useTypesenseStudio` | `components/typesense/use-typesense-studio.ts` | Manages cluster health, collections, sync jobs, custom entity configurations, synonyms, curations, stopwords, playground search queries, and search analytics |
| `useProductTypesenseWidgetState` | `src/hooks/use-product-typesense-widget-state.ts` | Fetches `/admin/typesense/documents/products/:id`, inspects indexed prices/stock/SKUs, and triggers single-product re-sync |

---

## Component library

All components live in `components/typesense/` and are internal to the Admin extension:

| Component | File | Purpose |
| --- | --- | --- |
| `TypesenseHeaderBar` | `header-bar.tsx` | Cluster health badge, node host/port, UI language switcher, refresh, and "Reindex All" button |
| `StatCard`, `NavigationCard` | `overview-cards.tsx` | KPI stat cards and navigation cards on `/typesense` |
| `OverviewTab` | `overview-tab.tsx` | Active collection aliases, physical versioned collections, document counts, and `mpt_sync_job` history |
| `EntitiesTab` | `entities-tab.tsx` | Built-in and custom entity index schemas, `queryBy` / `facetBy` settings, and custom entity registration modal |
| `MerchandisingTab`, `SynonymsSection`, `CurationsSection`, `StopwordsSection` | `merchandising-tab.tsx`, `synonyms-section.tsx`, `curations-section.tsx`, `stopwords-section.tsx` | Merchandising Studio for managing Multi-way/One-way Synonyms, Curations/Overrides, and Stopwords Sets |
| `PlaygroundTab`, `PlaygroundResultsSection`, `renderSafeHighlight` | `playground-tab.tsx`, `playground-results-section.tsx`, `safe-highlight.tsx` | Interactive Keyword, Semantic, and Hybrid (`alpha`) search tester with safe JSX highlight rendering |
| `AnalyticsTab` | `analytics-tab.tsx` | Search volume, average latency, CTR, conversion rate, popular queries, and zero-result queries with 1-click synonym creation |

---

## i18n

Translations are configured in `i18n/` using `react-i18next` across 10 locales (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL layout support). See [`i18n/README.md`](./i18n/README.md) for details.
