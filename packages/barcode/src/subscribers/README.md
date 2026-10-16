# Subscribers

Event subscribers registered by `medusa-plugin-barcode` under `src/subscribers/`.

```sh
subscribers/
└── product-created.ts        auto-assigns GS1 in-store EAN-13 barcodes on product/variant creation
```

---

## `product-created.ts` (`productBarcodeSubscriber`)

| Property | Value |
| --- | --- |
| **File** | `src/subscribers/product-created.ts` |
| **Events** | `["product-variant.created", "product.created"]` |
| **Option Guard** | `options.autoGenerateVariantBarcode !== false` (enabled by default) |
| **Workflow Invoked** | `bulkGenerateVariantBarcodesWorkflow` |

### Behavior

Whenever Medusa emits `product-variant.created` or `product.created`:

1. `productBarcodeSubscriber` resolves `BARCODE_MODULE` (`"barcode"`) from `container` and reads `await barcodeService.getModuleOptions()`.
2. If `options.autoGenerateVariantBarcode === false`, the subscriber exits immediately without modifying the variant.
3. Otherwise, it extracts `event.data?.variant_id || event.data?.id` and executes `bulkGenerateVariantBarcodesWorkflow(container).run(...)` with:
   - `variant_ids: [variantId]`
   - `prefix: options.internalBarcodePrefix || "200"` (3-digit GS1 in-store prefix `200`–`299`)
   - `overwrite: false` (never overwrites an existing barcode already set on the variant)
4. The workflow assigns a valid 13-digit GS1 EAN-13 barcode (plus matching `ean` and `upc` fields) on the variant in `Modules.PRODUCT` and creates a corresponding `BarcodeTag` row.
5. Any runtime error is caught non-fatally so product creation in Medusa is never blocked.

```ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { bulkGenerateVariantBarcodesWorkflow } from "../workflows"
import type { BarcodeModuleService } from "../modules/barcode/service"
import { BARCODE_MODULE } from "../modules/barcode/types"

export default async function productBarcodeSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; variant_id?: string }>) {
  try {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    const options = await barcodeService.getModuleOptions()
    if (options.autoGenerateVariantBarcode === false) {
      return
    }

    const variantId = event.data?.variant_id || event.data?.id
    if (!variantId) {
      return
    }

    await bulkGenerateVariantBarcodesWorkflow(container).run({
      input: {
        variant_ids: [variantId],
        prefix: options.internalBarcodePrefix || "200",
        overwrite: false,
      },
    })
  } catch {
    // Non-fatal subscriber execution
  }
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product.created"],
}
```