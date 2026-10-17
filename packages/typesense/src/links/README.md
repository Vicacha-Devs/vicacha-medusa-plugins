# Module Links — `medusa-plugin-typesense`

`medusa-plugin-typesense` does not define persistent database Module Links (`defineLink`) in `src/links/`.

## How Entity Data Is Resolved

Instead of creating cross-module database link tables, `medusa-plugin-typesense` queries Medusa's Remote Query Graph (`query.graph()`) directly:

1. **Index Synchronization (`syncEntitiesToTypesenseWorkflow`)**:
   - Queries `product`, `product_category`, `product_collection`, or any configured custom `graphEntity` via `query.graph({ entity, fields })`, transforms records into flat Typesense documents (`src/modules/typesense/utils/transformers.ts`), and imports them into Typesense collections.
2. **Storefront Hydration (`/store/typesense/products`, `/store/typesense/categories`, `/store/typesense/collections`)**:
   - Executes fast full-text, vector, or hybrid search against Typesense to obtain ranked document IDs and facets, then hydrates live pricing (`calculated_price`), inventory (`variants.inventory_quantity`), and relationships via `query.graph()`.

For more details on Medusa Module Links, see the [Medusa Module Links Documentation](https://docs.medusajs.com/learn/fundamentals/module-links).
