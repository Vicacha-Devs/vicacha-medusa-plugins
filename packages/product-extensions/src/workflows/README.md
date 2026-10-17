# Workflows

Medusa workflows (`@medusajs/framework/workflows-sdk`) that execute all mutations in `@vicacha-devs/medusa-plugin-product-extensions`. Every workflow step records pre-mutation state and defines a `compensate` handler to restore previous records or delete newly created records on rollback.

```
workflows/
├── index.ts                All 15 workflows and steps
├── upsert-product-ext.ts   Re-exports upsertProductExtWorkflow & upsertProductExtStep (@bambiste/medusa-product-ext compatibility)
└── upsert-variant-ext.ts   Re-exports upsertVariantExtWorkflow & upsertVariantExtStep (@bambiste/medusa-product-ext compatibility)
```

---

## Workflow Index

| Workflow ID | Export | Step ID | Compensation Behavior | Trigger |
| --- | --- | --- | --- | --- |
| `upsert-product-ext` | `upsertProductExtWorkflow` | `upsert-product-ext` | Deletes record if newly created, or restores `previousState` | `POST /admin/products/:product_id/extension` |
| `upsert-variant-ext` | `upsertVariantExtWorkflow` | `upsert-variant-ext` | Deletes record if newly created, or restores `previousState` | `POST /admin/products/:product_id/variants/:variant_id/extension` |
| `bulk-assign-variant-media-by-option` | `bulkAssignVariantMediaByOptionWorkflow` | `bulk-assign-variant-media-by-option` | Iterates `states[]` and deletes new variant extensions or restores `previousState` | `POST /admin/products/:product_id/variants/bulk-media` |
| `apply-attribute-template` | `applyAttributeTemplateWorkflow` | `apply-attribute-template` | Deletes extension if newly created, or restores previous `template_id`, `content_tree`, and `content_diff` | `POST /admin/products/:product_id/attributes` & `product.created` subscriber |
| `set-product-attributes` | `setProductAttributesWorkflow` | `set-product-attributes` | Calls `service.rollbackProductAttributeValues(product_id, previousValues)` | `POST /admin/products/:product_id/attributes` |
| `import-image-alts` | `importImageAltsWorkflow` | `import-image-alts` | Restores `previousStates` of `image_alts` across all affected products | `POST /admin/product-ext/image-alts` |
| `create-attribute` | `createAttributeWorkflow` | `create-attribute` | Deletes created attribute definition | `POST /admin/product-ext/attributes` |
| `update-attribute` | `updateAttributeWorkflow` | `update-attribute` | Restores previous attribute definition fields | `PATCH /admin/product-ext/attributes/:id` |
| `delete-attribute` | `deleteAttributeWorkflow` | `delete-attribute` | Recreates deleted attribute definition | `DELETE /admin/product-ext/attributes/:id` |
| `create-template` | `createTemplateWorkflow` | `create-template` | Deletes created template | `POST /admin/product-ext/templates` |
| `update-template` | `updateTemplateWorkflow` | `update-template` | Restores previous template fields | `PATCH /admin/product-ext/templates/:id` |
| `delete-template` | `deleteTemplateWorkflow` | `delete-template` | Recreates deleted template | `DELETE /admin/product-ext/templates/:id` |
| `create-feature` | `createFeatureWorkflow` | `create-feature` | Deletes created feature badge | `POST /admin/product-ext/features` |
| `update-feature` | `updateFeatureWorkflow` | `update-feature` | Restores previous feature badge fields | `PATCH /admin/product-ext/features/:id` |
| `delete-feature` | `deleteFeatureWorkflow` | `delete-feature` | Recreates deleted feature badge | `DELETE /admin/product-ext/features/:id` |
