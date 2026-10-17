# `@vicacha-devs/medusa-plugin-product-extensions`

The all-in-one **Medusa v2 Product Extension, Rich Media, Variant Galleries, Typed Custom Attributes, Hierarchical Content (`tree@1` / `diff@1`), Feature Badges & Multi-Storefront Presentation Overrides** plugin.

100% drop-in backward-compatible with `@bambiste/medusa-product-ext` while superseding 12+ fragmented Medusa v2 product extension packages:
- **`@bambiste/medusa-product-ext`** — Product & Variant `videos[]`, `tagline`, `ProductExt` module (`PRODUCT_EXT_MODULE = "ProductExt"`), `upsertProductExtWorkflow`, `upsertVariantExtWorkflow`
- **`@developerx12/medusa-plugin-product-video`** — Multi-provider videos: Medusa File Module MP4/WebM/HLS, YouTube, Vimeo, Mux, Cloudflare Stream + posters & WebVTT captions
- **`medusa-variant-images` & `@alphabite/medusa-variant-images`** — Variant thumbnails, ordered image galleries, and **Base-Option Bulk Assignment** (`Color = Navy`)
- **`@alpha-solutions/medusa-image-alt`** — Per-image alt-text, title, caption, focal point (`x`, `y`), per-locale overrides & bulk CSV import/export
- **`@empty-complete-org/medusa-product-attributes`, `@csbeker/medusa-product-attributes`, `@froze-labs/medusa-plugin-product-attributes` & `@linearcommerce/product-custom-attributes`** — 9 typed custom attributes (`text`, `number`, `boolean`, `select`, `multiselect`, `color`, `unit`, `file`, `sortable_list`), SI/Imperial unit normalization & conversion (`normalizeToSI`, `convertUnit`), category hierarchy inheritance, Unicode/Cyrillic slugification
- **`@codemind.ec/medusa-plugin-additional-info`** — Hierarchical `tree@1` templates and per-product `diff@1` overrides with DFS cycle detection
- **`@webloomlabs/product-features`** — Reusable Product Feature Badges catalog with icons, badge colors & subtitles
- **`medusa-product-options-metadata-voxsar`** — Option & option-value hex color swatches, image swatches & size-chart links
- **`@hectasquare/medusa-product-multi-storefront`** — Per-sales-channel and per-locale presentation overrides with automatic fallback (`exact channel+locale` → `channel-only` → `locale-only` → default)

> **Medusa compatibility:** `2.21.x` — keep peer dependencies aligned with your host application.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation & Configuration](#installation--configuration)
- [Architecture](#architecture)
- [Module & Data Models](#module--data-models)
- [Entity Links](#entity-links)
- [Workflows](#workflows)
- [Event Subscribers](#event-subscribers)
- [REST API](#rest-api)
- [Admin UI & Widgets](#admin-ui--widgets)
- [Storefront SDK, Hooks & UI Kit](#storefront-sdk-hooks--ui-kit)
- [Security Invariants](#security-invariants)
- [Development](#development)
- [License](#license)

---

## Features

- **Unified Product & Variant Media Galleries** — Interleave core Medusa images, multi-provider videos (YouTube, Vimeo, Mux, Cloudflare Stream, MP4/WebM/HLS), and interactive 3D/AR models (`.glb` + iOS `.usdz`) into a single ordered gallery.
- **Base-Option Bulk Variant Media** — Assign a thumbnail, ordered gallery images, videos, and swatch hex/image to every variant matching `option_title = option_value` (e.g., `Color = Navy`) in a single compensated workflow.
- **9 Typed Custom Attributes with SI/Imperial Normalization** — Define global or category-scoped attributes (`text`, `number`, `boolean`, `select`, `multiselect`, `color`, `unit`, `file`, `sortable_list`). `unit` values (`mm`, `cm`, `m`, `in`, `ft`, `g`, `kg`, `oz`, `lb`, `ml`, `l`, `fl_oz`, `c`, `f`, `k`, `w`, `kw`, `mah`, `wh`, `v`) are normalized to SI base units (`value_normalized_si`) for cross-unit range filtering (`POST /store/product-ext/filter`).
- **Hierarchical Content Sections (`tree@1` & `diff@1`)** — Author category-level `tree@1` content templates (accordions with markdown, ordered/unordered lists, and key-value blocks) and apply lightweight per-product `diff@1` patches (`hide_node_ids`, `override_sections`, `append_sections`) with DFS cycle detection.
- **Reusable Feature Badges Catalog** — Create brand/product highlight badges (`Waterproof`, `2-Year Warranty`, `Recycled Materials`) with custom icons and colors and attach them to products via `feature_ids`.
- **Image Alt-Text & Bulk CSV Import/Export** — Manage localized `alt`, `title`, `caption`, and `focal_point` per image URL or export/import the entire catalog via RFC-4180 CSV (`GET` / `POST /admin/product-ext/image-alts`) with formula-injection protection.
- **Multi-Storefront Presentation Overrides** — Override `tagline`, `videos`, and `media_items` per `sales_channel_id` and/or `locale` with deterministic fallback resolution.
- **Decoupled Admin Studio & Widgets** — Full Medusa Admin Studio under `/app/product-ext` (Overview, Attributes, Templates, Feature Badges, Bulk Variant Media, CSV Image Alt-Text) plus `product.details.after` and `product_category.details.after` widgets, localized across 10 languages (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL support).

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
pnpm add @vicacha-devs/medusa-plugin-product-extensions
```

Register the plugin in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-product-extensions",
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
Medusa Core (@medusajs/medusa/product)
  ├── Product ──────── (1:1 link) ──────── ProductExtension (product_extension)
  │                                          ├─ videos[], tagline, media_items[], models_3d[], attachments[]
  │                                          ├─ image_alts[], option_metadata[], storefront_overrides[], seo_metadata
  │                                          ├─ template_id ──► AttributeTemplate (product_ext_attribute_template)
  │                                          ├─ content_tree (tree@1) + content_diff (diff@1)
  │                                          └─ feature_ids[] ──► ProductFeature[] (product_ext_feature)
  │
  ├── ProductVariant ─ (1:1 link) ──────── VariantExtension (variant_extension)
  │                                          └─ thumbnail, images[], videos[], media_items[], option_signature, swatch_color, swatch_image_url
  │
  └── ProductAttributeValue (product_ext_attribute_value)
        └─ attribute_id / attribute_key ──► AttributeDefinition (product_ext_attribute)
```

---

## Module & Data Models

**Module Service Token:** `PRODUCT_EXT_MODULE = "ProductExt"` (`PRODUCT_EXT_MODULE_KEY = "product_ext"`)  
**Service Class:** `ProductExtModuleService` (also exported as `ProductExtService`)

| Model | Table Name | Key Columns |
|---|---|---|
| `ProductExtension` | `product_extension` | `id`, `product_id` (unique), `videos`, `tagline`, `media_items`, `models_3d`, `attachments`, `image_alts`, `content_tree`, `content_diff`, `template_id`, `feature_ids`, `option_metadata`, `storefront_overrides`, `seo_metadata`, `metadata` |
| `VariantExtension` | `variant_extension` | `id`, `variant_id` (unique), `product_id`, `thumbnail`, `images`, `videos`, `media_items`, `option_signature`, `swatch_color`, `swatch_image_url`, `metadata` |
| `AttributeDefinition` | `product_ext_attribute` | `id`, `key` (unique), `label`, `description`, `type` (`text \| number \| boolean \| select \| multiselect \| color \| unit \| file \| sortable_list`), `unit_family`, `default_unit`, `allowed_units`, `options`, `validation_rules`, `is_filterable`, `is_required`, `is_global`, `category_ids`, `sort_order`, `metadata` |
| `AttributeTemplate` | `product_ext_attribute_template` | `id`, `code` (unique), `name`, `description`, `category_ids`, `attribute_keys`, `content_tree` (`tree@1`), `is_active`, `metadata` |
| `ProductAttributeValue` | `product_ext_attribute_value` | `id`, `product_id`, `attribute_id`, `attribute_key`, `value_text`, `value_number`, `value_boolean`, `value_json`, `unit`, `value_normalized_si`, `sort_order`, `locale` |
| `ProductFeature` | `product_ext_feature` | `id`, `code` (unique), `title`, `subtitle`, `description`, `icon_url`, `icon_name`, `badge_color`, `sort_order`, `is_active`, `metadata` |

---

## Entity Links

| File | Left Entity | Right Entity | Notes |
|---|---|---|---|
| `src/links/product-extension-link.ts` | `ProductModule.linkable.product` | `ProductExtModule.linkable.productExtension` | 1 : 1 link between core `Product` and `ProductExtension` |
| `src/links/variant-extension-link.ts` | `ProductModule.linkable.productVariant` | `ProductExtModule.linkable.variantExtension` | 1 : 1 link between core `ProductVariant` and `VariantExtension` |

---

## Workflows

All workflows live in `src/workflows/` and implement full rollback compensation (restoring previous state on update or deleting newly created records):

| Workflow ID | Export | Trigger / Usage |
|---|---|---|
| `upsert-product-ext` | `upsertProductExtWorkflow` | `POST /admin/products/:product_id/extension` |
| `upsert-variant-ext` | `upsertVariantExtWorkflow` | `POST /admin/products/:product_id/variants/:variant_id/extension` |
| `bulk-assign-variant-media-by-option` | `bulkAssignVariantMediaByOptionWorkflow` | `POST /admin/products/:product_id/variants/bulk-media` |
| `apply-attribute-template` | `applyAttributeTemplateWorkflow` | `POST /admin/products/:product_id/attributes` & `product.created` subscriber |
| `set-product-attributes` | `setProductAttributesWorkflow` | `POST /admin/products/:product_id/attributes` |
| `import-image-alts` | `importImageAltsWorkflow` | `POST /admin/product-ext/image-alts` |
| `create-attribute` / `update-attribute` / `delete-attribute` | `createAttributeWorkflow`, `updateAttributeWorkflow`, `deleteAttributeWorkflow` | `/admin/product-ext/attributes` CRUD |
| `create-template` / `update-template` / `delete-template` | `createTemplateWorkflow`, `updateTemplateWorkflow`, `deleteTemplateWorkflow` | `/admin/product-ext/templates` CRUD |
| `create-feature` / `update-feature` / `delete-feature` | `createFeatureWorkflow`, `updateFeatureWorkflow`, `deleteFeatureWorkflow` | `/admin/product-ext/features` CRUD |

---

## Event Subscribers

| File | Events | Behavior |
|---|---|---|
| `src/subscribers/product-created.ts` | `product.created` | Checks if the newly created product belongs to any category linked to an active `AttributeTemplate` and automatically runs `applyAttributeTemplateWorkflow`. |
| `src/subscribers/product-deleted.ts` | `product.deleted`, `product-variant.deleted` | Purges `ProductExtension`, all `VariantExtension` rows, and `ProductAttributeValue` rows when a product is deleted, or deletes the single `VariantExtension` when a variant is deleted. |

---

## REST API

### Storefront Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/store/products/:product_id/extension` | Returns `{ product_id, videos, tagline, variants, media_gallery, models_3d, attachments, image_alts, content_sections, features, attributes, option_metadata, seo_metadata, resolved_override }`. Query params: `variant_ids`, `sales_channel_id`, `locale`. |
| `POST` | `/store/product-ext/filter` | Filters product IDs by typed attribute criteria (`eq`, `in`, `min`, `max`, `unit`) with automatic SI/Imperial unit normalization. |

### Admin Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` / `POST` | `/admin/products/:product_id/extension` | Retrieve or upsert `ProductExtension` for `:product_id`. |
| `GET` / `POST` | `/admin/products/:product_id/variants/:variant_id/extension` | Retrieve or upsert `VariantExtension` for `:variant_id`. |
| `POST` | `/admin/products/:product_id/variants/bulk-media` | Bulk-assign thumbnail, gallery images, videos, and swatch color/image to all variants matching `option_title = option_value`. |
| `GET` / `POST` | `/admin/products/:product_id/attributes` | Retrieve resolved attributes or set typed attribute values and apply a template. |
| `GET` / `POST` | `/admin/product-ext/attributes` | List (with category inheritance via `category_id` & `ancestor_category_ids`) or create attribute definitions. |
| `PATCH` / `DELETE` | `/admin/product-ext/attributes/:id` | Update or delete an attribute definition. |
| `GET` / `POST` | `/admin/product-ext/templates` | List or create `tree@1` content & attribute templates. |
| `PATCH` / `DELETE` | `/admin/product-ext/templates/:id` | Update or delete a template. |
| `GET` / `POST` | `/admin/product-ext/features` | List or create reusable product feature badges. |
| `PATCH` / `DELETE` | `/admin/product-ext/features/:id` | Update or delete a feature badge. |
| `GET` / `POST` | `/admin/product-ext/image-alts` | Bulk export (`GET ?product_ids=...`) or import (`POST { csv_content }`) image alt-text via CSV. |

---

## Admin UI & Widgets

All Admin routes, components, and hooks in `src/admin/` are decoupled into focused modules (`< 170` lines per file):

| Route / Zone | File | Description |
|---|---|---|
| `/product-ext` | `src/admin/routes/product-ext/page.tsx` | Overview dashboard with KPI `StatCard`s and `NavigationCard`s |
| `/product-ext/attributes` | `src/admin/routes/product-ext/attributes/page.tsx` | Attribute definitions table & filterable catalog |
| `/product-ext/attributes/create` | `src/admin/routes/product-ext/attributes/@create/page.tsx` | Focus modal to create a typed attribute definition |
| `/product-ext/templates` | `src/admin/routes/product-ext/templates/page.tsx` | Hierarchical `tree@1` & attribute templates table |
| `/product-ext/templates/create` | `src/admin/routes/product-ext/templates/@create/page.tsx` | Focus modal to create a content/attribute template |
| `/product-ext/features` | `src/admin/routes/product-ext/features/page.tsx` | Reusable product feature badges table |
| `/product-ext/features/create` | `src/admin/routes/product-ext/features/@create/page.tsx` | Focus modal to create a feature badge |
| `/product-ext/variant-media` | `src/admin/routes/product-ext/variant-media/page.tsx` | Base-option bulk variant media assignment tool |
| `/product-ext/image-alts` | `src/admin/routes/product-ext/image-alts/page.tsx` | Bulk CSV image alt-text export & import studio |
| `product.details.after` | `src/admin/widgets/product-ext-widget.tsx` | Product detail card for tagline, videos, 3D `.glb` URL & resolved attributes |
| `product_category.details.after` | `src/admin/widgets/category-attributes-widget.tsx` | Category detail card displaying inherited & category-specific attributes |

---

## Storefront SDK, Hooks & UI Kit

```tsx
import { createProductExtSdk } from "@vicacha-devs/medusa-plugin-product-extensions/sdk"
import {
  useStoreProductExtension,
  useVariantResolvedGallery,
  useProductAttributeFilter,
} from "@vicacha-devs/medusa-plugin-product-extensions/hooks"
import {
  ProductMediaGallery,
  VariantOptionSwatchPicker,
  ProductFeatureBadges,
  ProductSpecsTable,
  HierarchicalInfoAccordion,
  ProductAttachmentsList,
} from "@vicacha-devs/medusa-plugin-product-extensions/ui"

const sdk = createProductExtSdk({
  baseUrl: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  publishableApiKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})
```

---

## Security Invariants

- **SSRF & Scheme Protection (`src/modules/product-ext/utils/security.ts`)** — `validateExternalMediaUrl` blocks `javascript:`, `data:`, `vbscript:`, `file:`, `localhost`, `127.0.0.0/8`, `169.254.169.254`, private RFC1918 ranges, and IPv6 loopback/link-local addresses.
- **CSV Formula Injection Prevention** — `escapeCsvCell` prefixes leading `=`, `+`, `-`, `@`, `\t`, `\r` characters with a single quote (`'`) on CSV export.
- **Content Tree Cycle Detection** — `validateTreeDocV1` and `validateDiffDocV1` enforce schema invariants and run DFS cycle detection.

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
