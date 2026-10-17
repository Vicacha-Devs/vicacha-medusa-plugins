# API Routes

File-based REST routes under `/admin` and `/store`, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```
api/
├── validators.ts                                   Zod schemas (@medusajs/framework/zod) for all Admin & Store routes
├── middlewares.ts                                  defineMiddlewares binding validateAndTransformBody
├── admin/
│   ├── plugin/
│   │   └── route.ts                                GET /admin/plugin — health & plugin metadata check
│   ├── product-ext/
│   │   ├── attributes/
│   │   │   ├── route.ts                            GET, POST /admin/product-ext/attributes
│   │   │   └── [id]/
│   │   │       └── route.ts                        PATCH, DELETE /admin/product-ext/attributes/:id
│   │   ├── templates/
│   │   │   ├── route.ts                            GET, POST /admin/product-ext/templates
│   │   │   └── [id]/
│   │   │       └── route.ts                        PATCH, DELETE /admin/product-ext/templates/:id
│   │   ├── features/
│   │   │   ├── route.ts                            GET, POST /admin/product-ext/features
│   │   │   └── [id]/
│   │   │       └── route.ts                        PATCH, DELETE /admin/product-ext/features/:id
│   │   └── image-alts/
│   │       └── route.ts                            GET (export CSV), POST (import CSV) /admin/product-ext/image-alts
│   └── products/
│       └── [product_id]/
│           ├── extension/
│           │   └── route.ts                        GET, POST /admin/products/:product_id/extension
│           ├── attributes/
│           │   └── route.ts                        GET, POST /admin/products/:product_id/attributes
│           └── variants/
│               ├── bulk-media/
│               │   └── route.ts                    POST /admin/products/:product_id/variants/bulk-media
│               └── [variant_id]/
│                   └── extension/
│                       └── route.ts                GET, POST /admin/products/:product_id/variants/:variant_id/extension
└── store/
    ├── plugin/
    │   └── route.ts                                GET /store/plugin — storefront health check
    ├── product-ext/
    │   └── filter/
    │       └── route.ts                            POST /store/product-ext/filter
    └── products/
        └── [product_id]/
            └── extension/
                └── route.ts                        GET /store/products/:product_id/extension
```

---

## Endpoint Summary

### Storefront Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/store/products/:product_id/extension` | Returns the resolved storefront payload (`videos`, `tagline`, `media_gallery`, `models_3d`, `attachments`, `image_alts`, `content_sections`, `features`, `attributes`, `option_metadata`, `seo_metadata`, `resolved_override`, and optional `variants` map). Query params: `variant_ids`, `sales_channel_id`, `locale`. |
| `POST` | `/store/product-ext/filter` | Filters product IDs matching an array of typed attribute criteria (`eq`, `in`, `min`, `max`, `unit`) with automatic SI/Imperial unit normalization. |

### Admin Endpoints

| Method | Path | Validator Schema | Workflow / Service Method |
| --- | --- | --- | --- |
| `GET` | `/admin/products/:product_id/extension` | — | `service.getByProductId` |
| `POST` | `/admin/products/:product_id/extension` | `UpsertProductExtensionSchema` | `upsertProductExtWorkflow` |
| `GET` | `/admin/products/:product_id/variants/:variant_id/extension` | — | `service.getByVariantId` |
| `POST` | `/admin/products/:product_id/variants/:variant_id/extension` | `UpsertVariantExtensionSchema` | `upsertVariantExtWorkflow` |
| `POST` | `/admin/products/:product_id/variants/bulk-media` | `BulkAssignVariantMediaByOptionSchema` | `bulkAssignVariantMediaByOptionWorkflow` |
| `GET` | `/admin/products/:product_id/attributes` | — | `service.getProductAttributeValues` |
| `POST` | `/admin/products/:product_id/attributes` | `SetProductAttributesBodySchema` | `applyAttributeTemplateWorkflow` + `setProductAttributesWorkflow` |
| `GET` | `/admin/product-ext/attributes` | — | `service.listAttributes` |
| `POST` | `/admin/product-ext/attributes` | `CreateAttributeDefinitionSchema` | `createAttributeWorkflow` |
| `PATCH` | `/admin/product-ext/attributes/:id` | `UpdateAttributeDefinitionSchema` | `updateAttributeWorkflow` |
| `DELETE` | `/admin/product-ext/attributes/:id` | — | `deleteAttributeWorkflow` |
| `GET` | `/admin/product-ext/templates` | — | `service.listTemplates` |
| `POST` | `/admin/product-ext/templates` | `CreateAttributeTemplateSchema` | `createTemplateWorkflow` |
| `PATCH` | `/admin/product-ext/templates/:id` | `UpdateAttributeTemplateSchema` | `updateTemplateWorkflow` |
| `DELETE` | `/admin/product-ext/templates/:id` | — | `deleteTemplateWorkflow` |
| `GET` | `/admin/product-ext/features` | — | `service.listFeatures` |
| `POST` | `/admin/product-ext/features` | `CreateProductFeatureSchema` | `createFeatureWorkflow` |
| `PATCH` | `/admin/product-ext/features/:id` | `UpdateProductFeatureSchema` | `updateFeatureWorkflow` |
| `DELETE` | `/admin/product-ext/features/:id` | — | `deleteFeatureWorkflow` |
| `GET` | `/admin/product-ext/image-alts` | — | `service.exportAllImageAltsCsv` |
| `POST` | `/admin/product-ext/image-alts` | `ImportImageAltsCsvSchema` | `importImageAltsWorkflow` |

---

## Route conventions

- All Zod body validation schemas live in `src/api/validators.ts` (importing `z` from `@medusajs/framework/zod`) and are wired in `src/api/middlewares.ts` via `validateAndTransformBody`.
- Route handlers delegate mutations to compensated workflows in `src/workflows/index.ts`.
