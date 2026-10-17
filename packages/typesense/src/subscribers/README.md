# Subscribers

Event subscribers that automatically synchronize Medusa catalog changes to Typesense in real time when `autoIndex` is enabled.

```
subscribers/
├── product-sync.ts         Handles product.* & product-variant.* events
├── category-sync.ts        Handles product-category.* events
└── collection-sync.ts      Handles product-collection.* events
```

---

## Subscriber Index

| File | Subscribed Events | Workflow Invoked |
| --- | --- | --- |
| `product-sync.ts` | `product.created`, `product.updated`, `product.deleted`, `product-variant.created`, `product-variant.updated`, `product-variant.deleted` | Resolves affected `product_id`(s) (via `query.graph` when triggered by a variant event) and runs `upsertTypesenseDocumentsWorkflow` (`entity: "products"`) or `deleteTypesenseDocumentsWorkflow` on `product.deleted`. |
| `category-sync.ts` | `product-category.created`, `product-category.updated`, `product-category.deleted` | Runs `upsertTypesenseDocumentsWorkflow` (`entity: "categories"`) on create/update or `deleteTypesenseDocumentsWorkflow` on delete. |
| `collection-sync.ts` | `product-collection.created`, `product-collection.updated`, `product-collection.deleted` | Runs `upsertTypesenseDocumentsWorkflow` (`entity: "collections"`) on create/update or `deleteTypesenseDocumentsWorkflow` on delete. |
