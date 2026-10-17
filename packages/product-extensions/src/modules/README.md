# Modules

Custom Medusa module (`ProductExt`) implementing the data models, business logic, media parsers, SI/Imperial unit normalization, and hierarchical content tree resolution for `@vicacha-devs/medusa-plugin-product-extensions`.

```
modules/
└── product-ext/
    ├── index.ts                    Module("ProductExt", { service: ProductExtModuleService })
    ├── service.ts                  ProductExtModuleService (and ProductExtService alias)
    ├── types.ts                    DTOs, inputs, unit codes, and tree@1 / diff@1 types
    ├── models/
    │   └── index.ts                6 Medusa DML models
    └── utils/
        ├── security.ts             validateExternalMediaUrl, validateHexColor, escapeHtml, escapeCsvCell, sanitizeFilename, slugifyAttributeKey
        ├── media-parser.ts         Multi-provider video parser, buildUnifiedProductMedia, CSV image alt-text parser/serializer
        ├── unit-converter.ts       normalizeToSI, convertUnit, formatUnitDisplay
        └── content-tree.ts         validateTreeDocV1, validateDiffDocV1, resolveTree (with DFS cycle detection)
```

---

## Service Registration

- **Module token:** `PRODUCT_EXT_MODULE = "ProductExt"` (`PRODUCT_EXT_MODULE_KEY = "product_ext"` — 100% compatible with `@bambiste/medusa-product-ext`)
- **Service class:** `ProductExtModuleService` (also exported as `ProductExtService`)

---

## Data Models (`models/index.ts`)

| Model | Table Name | Purpose |
| --- | --- | --- |
| `ProductExtension` | `product_extension` | Per-product extension storing `videos`, `tagline`, `media_items`, `models_3d`, `attachments`, `image_alts`, `content_tree` (`tree@1`), `content_diff` (`diff@1`), `template_id`, `feature_ids`, `option_metadata`, `storefront_overrides`, and `seo_metadata`. |
| `VariantExtension` | `variant_extension` | Per-variant extension storing `thumbnail`, ordered `images`, `videos`, `media_items`, `option_signature`, `swatch_color`, and `swatch_image_url`. |
| `AttributeDefinition` | `product_ext_attribute` | Typed custom attribute schema (`text`, `number`, `boolean`, `select`, `multiselect`, `color`, `unit`, `file`, `sortable_list`), `unit_family`, `default_unit`, `allowed_units`, `options`, `validation_rules`, `is_filterable`, `is_global`, and `category_ids`. |
| `AttributeTemplate` | `product_ext_attribute_template` | Category-linked template bundling `attribute_keys` and a base `content_tree` (`tree@1`). |
| `ProductAttributeValue` | `product_ext_attribute_value` | Typed attribute value assigned to a product, including `value_normalized_si` for fast cross-unit numeric filtering and optional `locale`. |
| `ProductFeature` | `product_ext_feature` | Reusable product feature badge (`code`, `title`, `subtitle`, `description`, `icon_url`, `icon_name`, `badge_color`, `sort_order`, `is_active`). |

---

## Key Service Methods (`service.ts`)

- **Product Extensions:** `getByProductId`, `upsertByProductId`, `upsertByProductIdWithState`, `deleteByProductId`
- **Variant Extensions & Bulk Media:** `getByVariantId`, `getByVariantIds`, `listByProductId`, `upsertByVariantId`, `upsertByVariantIdWithState`, `deleteByVariantId`, `bulkAssignVariantMediaByOption`
- **Attribute Definitions:** `getAttributeByKey`, `createAttribute`, `updateAttribute`, `deleteAttribute`, `listAttributes` (supports `category_id` + `ancestor_category_ids` hierarchy inheritance)
- **Product Attribute Values & Filtering:** `getProductAttributeValues`, `setProductAttributesWithState`, `rollbackProductAttributeValues`, `filterProductIdsByAttributes`
- **Templates:** `getTemplateByIdOrCode`, `createTemplate`, `updateTemplate`, `deleteTemplate`, `listTemplates`, `applyTemplateToProductWithState`
- **Feature Badges:** `createFeature`, `updateFeature`, `deleteFeature`, `listFeatures`
- **Image Alt-Text CSV:** `exportAllImageAltsCsv`, `importImageAltsCsvWithState`
- **Storefront Resolution & Cleanup:** `resolveStorefrontOverride`, `getStorefrontProductPayload`, `purgeProductData`
