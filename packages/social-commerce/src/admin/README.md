# Admin

Medusa Admin extension — routes, widgets, decoupled components, data-fetching hooks, and 10-locale i18n dictionaries for the Social Commerce plugin.

```sh
admin/
├── tsconfig.json                   TypeScript config for the Admin Vite bundle
├── i18n/                           react-i18next setup and 10 locale JSON files
├── utils/
│   └── formatters.ts               isSafeExternalUrl, formatDateTime, and platform badge helpers
├── hooks/
│   ├── use-social-dashboard.ts     State, filtering & mutation hook for all /social-commerce routes
│   └── use-product-social-status.ts Hook fetching tagged posts & catalog sync status for a product
├── components/
│   ├── index.ts                    Barrel export for all Admin UI components
│   ├── overview-cards.tsx          StatCard & NavigationCard components
│   ├── dashboard-header.tsx        Header with platform filter & "Sync Now" button
│   ├── dashboard-tabs.tsx          Tab navigation bar
│   ├── accounts-tab.tsx            Connected OAuth accounts table & connect buttons
│   ├── feed-tab.tsx                Shoppable posts/reels grid & product hotspot tagger
│   ├── stories-tab.tsx             24h stories management view
│   ├── stories-table.tsx           Table of synced & local 24h stories
│   ├── story-create-form.tsx       Form for publishing a manual 24h shoppable story
│   ├── live-tab.tsx                Live shopping streams & stock reservation manager
│   ├── live-table.tsx              Table of scheduled, live, and ended streams
│   ├── live-create-form.tsx        Form for scheduling a new live stream
│   ├── catalog-tab.tsx             Outbound catalog sync table & XML/CSV/JSON feed URLs
│   └── product-social-summary.tsx  Card rendered inside product.details.after widget
├── routes/
│   └── social-commerce/            Page routes registered in the Medusa admin shell
│       ├── page.tsx                /social-commerce — overview dashboard
│       ├── accounts/
│       │   └── page.tsx            /social-commerce/accounts — connected accounts
│       ├── feed/
│       │   └── page.tsx            /social-commerce/feed — shoppable media feed & tagging
│       ├── stories/
│       │   ├── page.tsx            /social-commerce/stories — 24h stories list
│       │   └── @create/
│       │       └── page.tsx        /social-commerce/stories/create — publish story focus modal
│       ├── live/
│       │   ├── page.tsx            /social-commerce/live — live shopping streams
│       │   └── @create/
│       │       └── page.tsx        /social-commerce/live/create — schedule live stream focus modal
│       └── catalog/
│           └── page.tsx            /social-commerce/catalog — outbound catalog sync & feeds
└── widgets/
    └── product-social-widget.tsx   product.details.after widget
```

---

## Route & Widget registration

The top-level `/social-commerce` route exports a `config` object created with `defineRouteConfig` from `@medusajs/admin-sdk`:

```tsx
export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "social-commerce",
  icon: Channels,
})
```

`widgets/product-social-widget.tsx` registers in the `product.details.after` zone using `defineWidgetConfig`.

Every route and widget file is kept concise (`< 170` lines per file) and delegates data fetching to `hooks/` and UI rendering to `components/`.

---

## Data fetching & state hooks

| Hook | File | Purpose |
| --- | --- | --- |
| `useSocialDashboard` | `hooks/use-social-dashboard.ts` | Manages platform filtering (`all \| tiktok \| instagram \| facebook \| local`), fetches `/admin/social/accounts`, `/admin/social/posts`, `/admin/social/live`, and `/admin/social/catalog`, and provides mutation handlers for OAuth connect, media sync, product tagging, story publishing, live session lifecycle, and catalog sync |
| `useProductSocialStatus` | `hooks/use-product-social-status.ts` | Fetches all posts/stories where a specific `product_id` is tagged and its `CatalogSyncItem` status across connected accounts |

---

## Component library

All components live in `components/` and are internal to the Admin extension:

| Component | File | Purpose |
| --- | --- | --- |
| `StatCard`, `NavigationCard` | `overview-cards.tsx` | KPI stat cards and navigation cards on `/social-commerce` |
| `DashboardHeader` | `dashboard-header.tsx` | Platform selector and manual media sync trigger |
| `DashboardTabs` | `dashboard-tabs.tsx` | Sub-navigation tabs across social commerce views |
| `AccountsTab` | `accounts-tab.tsx` | OAuth account connection buttons (TikTok, Instagram, Facebook), token status, and disconnect action |
| `FeedTab` | `feed-tab.tsx` | Shoppable posts/reels table and inline X/Y & timestamp product hotspot tagger |
| `StoriesTab`, `StoriesTable`, `StoryCreateForm` | `stories-tab.tsx`, `stories-table.tsx`, `story-create-form.tsx` | Ephemeral 24h stories table and focus modal form (`createStoryFormSchema`) |
| `LiveTab`, `LiveTable`, `LiveCreateForm` | `live-tab.tsx`, `live-table.tsx`, `live-create-form.tsx` | Live shopping sessions table, start/end actions, flash-sale product pinning, and focus modal form (`createLiveFormSchema`) |
| `CatalogTab` | `catalog-tab.tsx` | Outbound catalog sync batch trigger, per-variant sync status table, and public XML/CSV/JSON feed links |
| `ProductSocialSummary` | `product-social-summary.tsx` | Product detail widget card showing tagged posts and catalog sync badges |

---

## i18n

Translations are configured in `i18n/` using `react-i18next` across 10 locales (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL support). See [`i18n/README.md`](./i18n/README.md) for details.
