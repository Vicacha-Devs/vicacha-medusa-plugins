# Admin

Medusa Admin extension — routes, widgets, decoupled 9:16 visual studio components, data-fetching hooks, and 10-locale i18n dictionaries for the Shoppable Stories plugin.

```sh
admin/
├── tsconfig.json                   TypeScript config for the Admin Vite bundle
├── i18n/                           react-i18next setup and 10 locale JSON files
├── utils/                          Ring gradient styles & 9:16 canvas helpers
├── hooks/
│   ├── use-stories-studio.ts       State & mutation hook for the /stories Studio routes
│   └── use-product-stories.ts      Hook for the Product Detail Stories widget
├── components/
│   ├── index.ts                    Barrel export for all 15 Admin UI components
│   ├── overview-cards.tsx          StatCard & NavigationCard components
│   ├── studio-header.tsx           Studio header bar with refresh & slide/ring counters
│   ├── story-ring-form.tsx         Form for creating a Story Highlight Ring (StoryGroup)
│   ├── story-rings-table.tsx       Table of Story Highlight Rings with delete action
│   ├── story-rings-tab.tsx         Circular ring preview bar + StoryRingsTable
│   ├── slide-preview-canvas.tsx    Interactive 9:16 visual canvas with click-to-place X/Y pins
│   ├── slide-form-section.tsx      Form for creating/editing a 9:16 image or video slide
│   ├── slide-timeline-section.tsx  Ordered slide timeline selector & active/delete controls
│   ├── hotspot-form-section.tsx    Form for pinning X/Y product hotspots onto the active slide
│   ├── canvas-editor-tab.tsx       3-pane 9:16 visual editor (slide form, 9:16 canvas, hotspots)
│   ├── sticker-form-section.tsx    Form for attaching Poll, Countdown, Coupon & Q&A stickers
│   ├── sticker-list-section.tsx    List of active stickers on the selected slide
│   ├── stickers-tab.tsx            Interactive Stickers builder tab
│   ├── analytics-tab.tsx           Conversion Funnel KPI cards & per-slide funnel table
│   └── product-stories-card.tsx    Card rendered inside product.details.after widget
├── routes/
│   └── stories/                    Page routes registered in the Medusa admin shell
│       ├── page.tsx                /stories — overview dashboard
│       ├── canvas/
│       │   └── page.tsx            /stories/canvas — 9:16 visual canvas & hotspot tagger
│       ├── rings/
│       │   ├── page.tsx            /stories/rings — Story Highlight Rings manager
│       │   └── @create/
│       │       └── page.tsx        /stories/rings/create — create Story Ring focus modal
│       ├── stickers/
│       │   └── page.tsx            /stories/stickers — interactive stickers builder
│       └── analytics/
│           └── page.tsx            /stories/analytics — conversion funnel analytics
└── widgets/
    └── product-stories-widget.tsx  product.details.after widget
```

---

## Route & Widget registration

The top-level `/stories` page exports a `config` object created with `defineRouteConfig` from `@medusajs/admin-sdk`:

```tsx
export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "stories",
  icon: BuildingStorefront,
})
```

`widgets/product-stories-widget.tsx` registers in the `product.details.after` zone using `defineWidgetConfig`.

All route and widget files are kept concise (`< 170` lines per file) and delegate state management to `hooks/` and UI rendering to `components/`.

---

## Data fetching & state hooks

| Hook | File | Purpose |
| --- | --- | --- |
| `useStoriesStudio` | `hooks/use-stories-studio.ts` | Manages full studio state (`groups`, `slides`, `analytics`, selected slide, 9:16 canvas click coordinates, hotspot form state, sticker form state) and calls `/admin/stories/*` endpoints |
| `useProductStories` | `hooks/use-product-stories.ts` | Fetches all story slides featuring a specific `product_id` and provides a 1-click `handleQuickCreateProductStory` action using the product's thumbnail, title, handle, and price |

---

## Component library

All components live in `components/` and are internal to the Admin extension:

| Component | File | Purpose |
| --- | --- | --- |
| `StatCard`, `NavigationCard` | `overview-cards.tsx` | KPI stat cards and navigation cards on `/stories` |
| `StudioHeader` | `studio-header.tsx` | Studio title, subtitle, and refresh controls |
| `StoryRingsTab`, `StoryRingsTable`, `StoryRingForm` | `story-rings-tab.tsx`, `story-rings-table.tsx`, `story-ring-form.tsx` | Circular Highlight Ring preview bar, rings table, and create ring form |
| `CanvasEditorTab`, `SlidePreviewCanvas`, `SlideFormSection`, `SlideTimelineSection`, `HotspotFormSection` | `canvas-editor-tab.tsx`, `slide-preview-canvas.tsx`, `slide-form-section.tsx`, `slide-timeline-section.tsx`, `hotspot-form-section.tsx` | Interactive 9:16 slide builder with click-to-position `(x_percent, y_percent)` product hotspot pins |
| `StickersTab`, `StickerFormSection`, `StickerListSection` | `stickers-tab.tsx`, `sticker-form-section.tsx`, `sticker-list-section.tsx` | Interactive Poll, Countdown, Coupon, and Q&A sticker builder |
| `AnalyticsTab` | `analytics-tab.tsx` | Conversion funnel metrics (`impression` → `complete` → `hotspot_click` → `add_to_cart`) |
| `ProductStoriesCard` | `product-stories-card.tsx` | Product detail widget card with 1-click story slide generator |

---

## i18n

Translations are configured in `i18n/` using `react-i18next` across 10 locales (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL layout support). See [`i18n/README.md`](./i18n/README.md) for details.
