# API Routes

File-based REST routes under the `admin` and `store` surfaces, following Medusa v2's `src/api/<surface>/<path>/route.ts` convention.

```sh
api/
├── validators.ts                                   Zod schemas for all Admin & Store request bodies
├── middlewares.ts                                  Route-level validateAndTransformBody middleware bindings
├── admin/
│   ├── plugin/
│   │   └── route.ts                                GET /admin/plugin — plugin health check
│   └── barcodes/
│       ├── route.ts                                GET /admin/barcodes — list linked products & studio overview
│       ├── lookup/
│       │   └── route.ts                            POST /admin/barcodes/lookup — 10-provider GTIN/ISBN lookup
│       ├── create-from-barcode/
│       │   └── route.ts                            POST /admin/barcodes/create-from-barcode — lookup & create product
│       ├── batch/
│       │   └── route.ts                            POST /admin/barcodes/batch — batch import up to 100 barcodes
│       ├── bulk-generate/
│       │   └── route.ts                            POST /admin/barcodes/bulk-generate — assign GS1 EAN-13 to variants
│       ├── scan/
│       │   └── route.ts                            POST /admin/barcodes/scan — quick scan lookup / stock adjust
│       ├── cache/
│       │   └── route.ts                            GET, DELETE /admin/barcodes/cache — inspect or purge cache
│       ├── [barcode]/
│       │   └── route.ts                            GET, DELETE /admin/barcodes/:barcode — inspect or delete barcode
│       ├── tags/
│       │   ├── route.ts                            GET, POST /admin/barcodes/tags — list or create 1D/2D & QR tags
│       │   └── [id]/
│       │       └── route.ts                        GET, PATCH, DELETE /admin/barcodes/tags/:id — manage tag by ID
│       ├── templates/
│       │   └── route.ts                            GET, POST /admin/barcodes/templates — list presets or save template
│       ├── print/
│       │   └── route.ts                            POST /admin/barcodes/print — render HTML+SVG & Zebra ZPL II labels
│       └── count-sessions/
│           ├── route.ts                            GET, POST /admin/barcodes/count-sessions — list or start session
│           └── [id]/
│               ├── scan/
│               │   └── route.ts                    POST /admin/barcodes/count-sessions/:id/scan — record item scan
│               └── apply/
│                   └── route.ts                    POST /admin/barcodes/count-sessions/:id/apply — apply variance
└── store/
    ├── plugin/
    │   └── route.ts                                GET /store/plugin — storefront plugin status
    └── barcodes/
        └── [code]/
            ├── route.ts                            GET /store/barcodes/:code — resolve scan (?format=json|svg)
            └── verify/
                └── route.ts                        GET, POST /store/barcodes/:code/verify — verify HMAC-SHA256 seal
```

---

## Admin endpoints (`15` barcode routes)

| Method(s) | Path | Zod Validator | Workflow / Service Delegate | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/admin/barcodes` | — | `BarcodeModuleService` | Lists `BarcodeProduct` links (filterable by `?product_id=`), tags, sessions, cache stats & active providers |
| `POST` | `/admin/barcodes/lookup` | `LookupBarcodeBodySchema` | `barcodeService.lookupBarcode` | Queries the 10-provider chain (`first-hit` or `deep-merge`) without creating a product |
| `POST` | `/admin/barcodes/create-from-barcode` | `CreateFromBarcodeBodySchema` | `lookupAndCreateProductWorkflow` | Enriches a barcode and creates a Medusa Product + Variant + `BarcodeProduct` link |
| `POST` | `/admin/barcodes/batch` | `BatchBarcodeImportBodySchema` | `batchBarcodeImportWorkflow` | Batch-imports up to 100 barcodes into Medusa Products + Variants with rollback compensation |
| `POST` | `/admin/barcodes/bulk-generate` | `BulkGenerateBarcodesBodySchema` | `bulkGenerateVariantBarcodesWorkflow` | Generates GS1 in-store (`200`–`299`) EAN-13 codes for variants and syncs `barcode`/`ean`/`upc` |
| `POST` | `/admin/barcodes/scan` | `QuickScanAdjustBodySchema` | `BarcodeModuleService` / `Modules.INVENTORY` | Resolves a scanned barcode and performs optional `lookup`, `increment`, `decrement`, or `set` stock actions |
| `GET`, `DELETE` | `/admin/barcodes/cache` | — | `barcodeService.purgeExpiredCache` / `clearAllCache` | Lists `barcode_cache` rows or purges expired entries (`?all=true` clears all cache rows) |
| `GET`, `DELETE` | `/admin/barcodes/:barcode` | — | `BarcodeModuleService` | Returns parsed GS1 metadata, linked `BarcodeProduct`, `BarcodeTag`, and SVG, or deletes mapping/cache |
| `GET`, `POST` | `/admin/barcodes/tags` | `CreateBarcodeTagBodySchema` (`POST`) | `generateBarcodeTagWorkflow` | Lists `BarcodeTag` rows (`?product_id=`, `?target_id=`) or creates a signed 1D/2D `BarcodeTag` |
| `GET`, `PATCH`, `DELETE` | `/admin/barcodes/tags/:id` | `UpdateBarcodeTagBodySchema` (`PATCH`) | `BarcodeModuleService` | Retrieves, updates, or deletes a specific `BarcodeTag` by ID |
| `GET`, `POST` | `/admin/barcodes/templates` | `CreateLabelTemplateBodySchema` (`POST`) | `BarcodeModuleService` | Lists all 7 built-in thermal/A4 presets + custom templates, or creates a custom `BarcodeLabelTemplate` |
| `POST` | `/admin/barcodes/print` | `PrintLabelsBodySchema` | `barcodeService.printLabels` | Renders print-ready HTML+SVG sheets and raw Zebra ZPL II (`^XA...^XZ`) thermal commands |
| `GET`, `POST` | `/admin/barcodes/count-sessions` | `CreateCountSessionBodySchema` (`POST`) | `barcodeService.startCountSession` | Lists warehouse stock-take sessions with items, or starts a new `BarcodeCountSession` |
| `POST` | `/admin/barcodes/count-sessions/:id/scan` | `RecordCountScanBodySchema` | `scanInventoryCountWorkflow` | Records a barcode scan (`delta` or `set_quantity`) inside an active count session |
| `POST` | `/admin/barcodes/count-sessions/:id/apply` | `ApplyCountSessionBodySchema` | `applyInventoryCountWorkflow` | Completes a count session and reconciles stock variances with `Modules.INVENTORY` |

---

## Store endpoints (`2` barcode routes)

| Method(s) | Path | Zod Validator | Service Delegate | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/store/barcodes/:code` | — | `barcodeService.resolveStoreScan` | Resolves a barcode/QR scan and increments `scan_count` (`?format=json`), or streams raw `image/svg+xml` (`?format=svg&symbology=ean13`) |
| `GET`, `POST` | `/store/barcodes/:code/verify` | `VerifyStoreBarcodeBodySchema` (`POST`) | `barcodeService.verifyTagAuthenticity` | Constant-time `HMAC-SHA256` anti-counterfeit verification via `?sig=` query param or JSON body `{ signature }` |

---

## Validation & middlewares

All request body schemas are defined in `src/api/validators.ts` (importing `z` from `@medusajs/framework/zod`) with strict length, numeric, and array bounds (e.g., max 100 barcodes per batch import, max 200 items per label print request).

`src/api/middlewares.ts` binds each schema to its route and HTTP method using `defineMiddlewares` and `validateAndTransformBody`:

```ts
import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { LookupBarcodeBodySchema } from "./validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/barcodes/lookup",
      method: ["POST"],
      middlewares: [validateAndTransformBody(LookupBarcodeBodySchema)],
    },
    // ...
  ],
})
```

---

## Route file conventions

- Each `route.ts` file exports named HTTP verb functions (`GET`, `POST`, `PATCH`, `DELETE`).
- Route handlers read validated bodies from `req.validatedBody` (falling back to `req.body` if needed), resolve `BARCODE_MODULE` or execute one of the 6 workflows from `src/workflows/index.ts` via `req.scope`, and return structured JSON (or `image/svg+xml` when `?format=svg` is requested on `/store/barcodes/:code`).
- No domain math, SVG rendering, or external HTTP calls live directly inside route handlers.
