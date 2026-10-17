# Admin

Medusa Admin extension — routes, widgets, decoupled components, data-fetching hooks, and 10-locale i18n dictionaries for the Product Extensions plugin.

```sh
admin/
├── index.ts                        Re-exports routes, widgets, components, hooks, and i18n
├── tsconfig.json                   TypeScript config for the Admin Vite bundle
├── i18n/                           react-i18next setup and 10 locale JSON files
├── hooks/
│   ├── use-product-ext-studio.ts   State & mutation hook for the /product-ext Studio routes
│   └── use-product-ext-widget.ts   Hooks for ProductExtWidget & CategoryAttributesWidget
├── components/
│   ├── index.tsx                   Barrel export for all Admin UI components
│   ├── overview-cards.tsx          StatCard & NavigationCard components
│   ├── product-ext-studio-header.tsx Studio header bar with refresh & locale controls
│   ├── attribute-create-form.tsx   Form for creating typed attribute definitions
│   ├── attribute-definitions-table.tsx Table displaying attribute definitions & delete action
│   ├── template-create-form.tsx    Form for creating tree@1 & attribute templates
│   ├── templates-table.tsx         Table displaying templates & delete action
│   ├── feature-create-form.tsx     Form for creating reusable product feature badges
│   ├── feature-badges-table.tsx    Table displaying feature badges & delete action
│   ├── variant-bulk-media-section.tsx Base-option bulk variant media assignment form
│   ├── image-alts-csv-section.tsx  Bulk CSV image alt-text export & import panel
│   ├── product-ext-detail-card.tsx Card rendered inside product.details.after widget
│   └── category-attributes-card.tsx Card rendered inside product_category.details.after widget
├── routes/
│   └── product-ext/                Page routes registered in the Medusa admin shell
│       ├── page.tsx                /product-ext — overview dashboard
│       ├── attributes/
│       │   ├── page.tsx            /product-ext/attributes — attribute definitions list
│       │   └── @create/
│       │       └── page.tsx        /product-ext/attributes/create — create attribute focus modal
│       ├── templates/
│       │   ├── page.tsx            /product-ext/templates — templates list
│       │   └── @create/
│       │       └── page.tsx        /product-ext/templates/create — create template focus modal
│       ├── features/
│       │   ├── page.tsx            /product-ext/features — feature badges list
│       │   └── @create/
│       │       └── page.tsx        /product-ext/features/create — create feature focus modal
│       ├── variant-media/
│       │   └── page.tsx            /product-ext/variant-media — bulk variant media by option
│       └── image-alts/
│           └── page.tsx            /product-ext/image-alts — CSV image alt-text import/export
└── widgets/
    ├── product-ext-widget.tsx      product.details.after widget
    └── category-attributes-widget.tsx product_category.details.after widget
```

---

## Route & Widget registration

The top-level `/product-ext` page exports a `config` object created with `defineRouteConfig` from `@medusajs/admin-sdk`:

```tsx
export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "product-ext",
  icon: Tag,
})
```

Each widget exports a `config` object created with `defineWidgetConfig`:
- `product-ext-widget.tsx` → `zone: "product.details.after"`
- `category-attributes-widget.tsx` → `zone: "product_category.details.after"`

All route and widget files are kept concise (`< 170` lines per file) and compose `LayoutComposer` from `@medusajs/dashboard/components` with presentational components in `components/` and state hooks in `hooks/`.

---

## Data fetching & state hooks

| Hook | File | Purpose |
| --- | --- | --- |
| `useProductExtStudio` | `hooks/use-product-ext-studio.ts` | Fetches attributes, templates, and feature badges; exposes create/delete handlers, bulk variant media assignment, and CSV image alt-text export/import |
| `useProductExtWidget` | `hooks/use-product-ext-widget.ts` | Fetches and saves `/admin/products/:id/extension` and `/admin/products/:id/attributes` for a product detail page |
| `useCategoryAttributesWidget` | `hooks/use-product-ext-widget.ts` | Fetches `/admin/product-ext/attributes?category_id=...` for a product category detail page |

---

## Component library

All Admin UI components live in `components/` and are internal to the Admin extension:

| Component | File | Purpose |
| --- | --- | --- |
| `StatCard`, `NavigationCard` | `overview-cards.tsx` | KPI stat cards and 2-column navigation grid cards on `/product-ext` |
| `ProductExtStudioHeader` | `product-ext-studio-header.tsx` | Header bar with title, subtitle, and refresh button |
| `AttributeCreateForm` | `attribute-create-form.tsx` | Form for creating a typed attribute definition (`text`, `number`, `unit`, `select`, etc.) |
| `AttributeDefinitionsTable` | `attribute-definitions-table.tsx` | Table of attribute definitions with type, unit family, filterable/global badges, and delete action |
| `TemplateCreateForm` | `template-create-form.tsx` | Form for creating an attribute & `tree@1` content template |
| `TemplatesTable` | `templates-table.tsx` | Table of templates with code, linked attribute keys, category IDs, and delete action |
| `FeatureCreateForm` | `feature-create-form.tsx` | Form for creating a reusable product feature badge |
| `FeatureBadgesTable` | `feature-badges-table.tsx` | Table of feature badges with code, subtitle, color swatch, and delete action |
| `VariantBulkMediaSection` | `variant-bulk-media-section.tsx` | Form to bulk-assign media & swatches to variants matching `option_title = option_value` |
| `ImageAltsCsvSection` | `image-alts-csv-section.tsx` | Panel to export and import RFC-4180 CSV image alt-text metadata |
| `ProductExtDetailCard` | `product-ext-detail-card.tsx` | Product detail widget UI for tagline, videos, 3D `.glb` model, and resolved attributes |
| `CategoryAttributesCard` | `category-attributes-card.tsx` | Category detail widget UI listing inherited & category-scoped attributes |

---

## i18n

Translations are configured in `i18n/` using `react-i18next` across 10 locales (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL layout support). See [`i18n/README.md`](./i18n/README.md) for details.
