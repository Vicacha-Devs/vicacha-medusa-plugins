# Workflows

Medusa v2 workflows that implement `medusa-plugin-barcode` catalog enrichment, batch importing, GS1 variant barcode generation, dynamic tag signing, and warehouse stock-take reconciliation. Each workflow is composed of atomic, compensable steps.

```sh
workflows/
├── index.ts                          re-exports every workflow and input type
├── helpers.ts                        shared tryResolveService
├── lookup-and-create-product.ts
├── batch-barcode-import.ts
├── bulk-generate-variant-barcodes.ts
├── generate-barcode-tag.ts
├── scan-inventory-count.ts
└── apply-inventory-count.ts
```

---

## Step & workflow conventions

- Every step is created with `createStep` and every workflow is created with `createWorkflow` from `@medusajs/framework/workflows-sdk`.
- Every step ID and workflow ID uses explicit kebab-case matching its name (e.g. `"lookup-and-create-product"`), satisfying `@medusajs/eslint-plugin` rules.
- Steps resolve `BARCODE_MODULE` (`"barcode"`) and optional Medusa core modules (`Modules.PRODUCT`, `Modules.FILE`, `Modules.INVENTORY`) from `container`.
- Every mutating step defines a `compensate` handler to roll back created records or restore previous state if a downstream error occurs.

---

## Workflow index

| Workflow Export | Workflow / Step ID | Trigger / Caller | Step Actions | Rollback Compensation |
| --- | --- | --- | --- | --- |
| `lookupAndCreateProductWorkflow` | `"lookup-and-create-product"` | `POST /admin/barcodes/create-from-barcode` | 1. Calls `barcodeService.lookupBarcode` (`first-hit` or `deep-merge`).<br>2. Optionally downloads external product images (`downloadProductImageBuffer`, SSRF-checked) and uploads them to `Modules.FILE`.<br>3. Maps metadata via `mapToMedusaCreateProduct` and creates a Medusa Product + Variant in `Modules.PRODUCT`.<br>4. Upserts `BarcodeProduct` via `barcodeService.upsertBarcodeProductLink`. | Deletes the created `BarcodeProduct` row (`deleteBarcodeProducts`) and deletes the created Medusa Product (`productService.deleteProducts`). |
| `batchBarcodeImportWorkflow` | `"batch-barcode-import"` | `POST /admin/barcodes/batch` | Deduplicates up to 100 barcodes, looks up each across the 10-provider chain, creates Medusa Products + Variants in `Modules.PRODUCT` (or draft placeholders when `createMissingAsDraft: true`), and links each via `BarcodeProduct`. | Deletes all `BarcodeProduct` links created during the batch and deletes all Medusa Products created in `Modules.PRODUCT`. |
| `bulkGenerateVariantBarcodesWorkflow` | `"bulk-generate-variant-barcodes"` | `POST /admin/barcodes/bulk-generate` & `product-created` subscriber | Lists target variants from `Modules.PRODUCT`, generates GS1 in-store (`200`–`299`) EAN-13 codes (`generateInternalVariantBarcode`), updates `barcode`, `ean`, and `upc` on each variant (`upsertProductVariants`), and creates a `BarcodeTag` per variant. | Deletes all newly created `BarcodeTag` rows (`deleteBarcodeTags`) and restores each variant's previous `barcode`, `ean`, and `upc` values via `upsertProductVariants`. |
| `generateBarcodeTagWorkflow` | `"generate-barcode-tag"` | `POST /admin/barcodes/tags` | Creates or updates a 1D/2D `BarcodeTag` with rendered SVG markup and `HMAC-SHA256` signature (`createOrUpdateBarcodeTag`). When `upload_svg_to_file_module: true`, uploads `<code >.svg` to `Modules.FILE` and stores `svg_url`. | Deletes the created `BarcodeTag` (`deleteBarcodeTags`). |
| `scanInventoryCountWorkflow` | `"scan-inventory-count"` | `POST /admin/barcodes/count-sessions/:id/scan` | Calls `barcodeService.recordCountSessionScan` to apply a `+1`, `-1`, or `set_quantity` scan to a `BarcodeCountItem` and recalculate `BarcodeCountSession` totals and variance. | Returns `{ sessionId, itemId }` context for audit tracking. |
| `applyInventoryCountWorkflow` | `"apply-inventory-count"` | `POST /admin/barcodes/count-sessions/:id/apply` | Marks the `BarcodeCountSession` as `"completed"` (`completeCountSession`) and, for every item with a non-zero variance and SKU, updates `stocked_quantity` at `location_id` in `Modules.INVENTORY` (`updateInventoryLevels`). | Reverts the `BarcodeCountSession` status back to `"in_progress"` and clears `completed_at`. |

---

## Executing a workflow

All workflows can be imported from `medusa-plugin-barcode` or `medusa-plugin-barcode/workflows` and executed in API routes, subscribers, or custom services:

```ts
import { lookupAndCreateProductWorkflow } from "medusa-plugin-barcode/workflows"

const { result } = await lookupAndCreateProductWorkflow(req.scope).run({
  input: {
    barcode: "3017620422003",
    status: "draft",
    strategy: "deep-merge",
    downloadImages: false,
  },
})
```
