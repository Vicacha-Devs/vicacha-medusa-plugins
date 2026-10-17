# Subscribers

Event subscribers that keep `ProductExtModule` data synchronized with Medusa's core `@medusajs/medusa/product` module lifecycle events.

```
subscribers/
├── product-created.ts      Handles product.created — auto-applies matching category AttributeTemplate
└── product-deleted.ts      Handles product.deleted & product-variant.deleted — cascade cleanup
```

---

## Subscriber Index

| File | Subscribed Events | Behavior |
| --- | --- | --- |
| `product-created.ts` | `product.created` | Inspects `event.data.category_ids`. If the product does not yet have a `template_id` and belongs to a category linked to an active `AttributeTemplate`, executes `applyAttributeTemplateWorkflow` to initialize the product's `template_id` and `content_tree`. |
| `product-deleted.ts` | `product.deleted`, `product-variant.deleted` | On `product.deleted`, calls `service.purgeProductData(productId)` to remove the `ProductExtension`, all `VariantExtension` rows for that product, and all `ProductAttributeValue` rows. On `product-variant.deleted`, calls `service.deleteByVariantId(variantId)`. |
