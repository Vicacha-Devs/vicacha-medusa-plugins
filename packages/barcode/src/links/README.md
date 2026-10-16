# Links

Cross-module entity references that associate `medusa-plugin-barcode` models (`BarcodeProduct`, `BarcodeTag`, `BarcodeCountSession`, `BarcodeCountItem`) with Medusa core entities (`Product`, `ProductVariant`, `Order`, `StockLocation`, and `InventoryItem`) while preserving strict module isolation.

```sh
links/
└── README.md         documentation for cross-module ID references and optional defineLink joins
```

---

## How `medusa-plugin-barcode` links to Medusa core entities

Instead of creating hard foreign-key constraints across module boundaries, `medusa-plugin-barcode` stores indexed plain-string reference IDs on its DML models in `src/modules/barcode/models/index.ts` and coordinates lifecycle changes through Medusa v2 workflows (`src/workflows/index.ts`):

| Barcode Model | Reference Columns | Target Medusa Core Entity | Indexing & Resolution |
| --- | --- | --- | --- |
| `BarcodeProduct` | `product_id`, `variant_id` | `Product`, `ProductVariant` (`Modules.PRODUCT`) | Indexed on `barcode` (unique), `product_id`, and `variant_id`. Created/rolled back by `lookupAndCreateProductWorkflow` and `batchBarcodeImportWorkflow`. |
| `BarcodeTag` | `target_type` (`product` \| `variant` \| `order` \| `custom`), `target_id`, `product_id`, `variant_id` | `Product`, `ProductVariant` (`Modules.PRODUCT`), `Order` (`Modules.ORDER`) | Indexed on `code` (unique), `[target_type, target_id]`, `product_id`, and `variant_id`. Created by `generateBarcodeTagWorkflow` and `bulkGenerateVariantBarcodesWorkflow`. |
| `BarcodeCountSession` | `location_id` | `StockLocation` (`Modules.STOCK_LOCATION`) | Indexed on `status` and `location_id`. Used by `applyInventoryCountWorkflow` when reconciling stock levels. |
| `BarcodeCountItem` | `product_id`, `variant_id`, `sku` | `Product`, `ProductVariant` (`Modules.PRODUCT`), `InventoryItem` (`Modules.INVENTORY`) | Indexed on `session_id` and `[session_id, barcode]` (unique). Reconciled against `Modules.INVENTORY` by `sku` and `location_id`. |

---

## Adding a declarative `defineLink` (optional)

If your host application wants to traverse `BarcodeProduct` or `BarcodeTag` directly through `query.graph` / `remoteQuery` alongside Medusa's `Product` model, you can add a link file in `src/links/` (for example `src/links/product-barcode.ts`):

```ts
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BarcodeModule from "../modules/barcode"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: BarcodeModule.linkable.barcodeProduct,
    isList: true,
  }
)
```

After adding a `defineLink` file, sync the link table in the host application:

```bash
npx medusa db:migrate
```