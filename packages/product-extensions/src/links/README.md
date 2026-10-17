# Links

Remote link definitions that join `ProductExtModule` entities to Medusa core `@medusajs/medusa/product` entities without creating cross-module foreign keys.

```
links/
├── index.ts                      Barrel exporting productExtensionLink & variantExtensionLink
├── product-extension-link.ts     Product (core)         ↔  ProductExtension (ProductExt)
└── variant-extension-link.ts     ProductVariant (core)  ↔  VariantExtension (ProductExt)
```

---

## Link definitions

| File | Left | Right | Cardinality |
| --- | --- | --- | --- |
| `product-extension-link.ts` | `ProductModule.linkable.product` | `ProductExtModule.linkable.productExtension` | 1 : 1 |
| `variant-extension-link.ts` | `ProductModule.linkable.productVariant` | `ProductExtModule.linkable.variantExtension` | 1 : 1 |

---

## Syncing to the database

Links are applied when running migrations in the host application:

```bash
npx medusa db:migrate
```

---

## Cascade cleanup

In addition to remote links, `src/subscribers/product-deleted.ts` listens for `product.deleted` and `product-variant.deleted` events and calls `service.purgeProductData(productId)` / `service.deleteByVariantId(variantId)` to ensure all `ProductExtension`, `VariantExtension`, and `ProductAttributeValue` records are cleaned up when core products or variants are deleted.
