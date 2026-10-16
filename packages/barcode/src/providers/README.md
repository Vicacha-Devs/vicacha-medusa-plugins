# Lookup Providers

External GTIN, EAN, UPC, and ISBN product lookup providers for `medusa-plugin-barcode`.

While Medusa core module providers (such as File or Notification providers) can be placed under `src/providers/`, all **GTIN/ISBN barcode lookup providers** in `medusa-plugin-barcode` live in [`src/modules/barcode/providers/index.ts`](../modules/barcode/providers/index.ts) and are managed by `ProviderRegistry`.

```sh
modules/barcode/providers/
└── index.ts          BaseBarcodeProvider, ProviderRegistry, downloadProductImageBuffer & 10 providers
```

---

## Built-in 10-provider lookup chain

All 10 built-in providers extend `BaseBarcodeProvider` and normalize external API responses into a unified `NormalizedBarcodeProduct` schema:

| # | Provider Key | Class Name | Default Priority | API Key Required? | Specialty / Catalog |
| :---: | --- | --- | :---: | :---: | --- |
| 1 | `openfoodfacts` | `OpenFoodFactsProvider` | `10` | No (Free) | Global food, beverages, groceries, nutrition & ingredients |
| 2 | `googlebooks` | `GoogleBooksProvider` | `15` (Promoted `#1` on ISBN) | Optional (`apiKey`) | Books, magazines & media (`978`/`979` ISBN-13) |
| 3 | `openlibrary` | `OpenLibraryProvider` | `18` (Promoted `#2` on ISBN) | No (Free) | Internet Archive OpenLibrary ISBN metadata & book covers |
| 4 | `openbeautyfacts` | `OpenBeautyFactsProvider` | `20` | No (Free) | Cosmetics, skincare, fragrances & personal care |
| 5 | `openpetfoodfacts` | `OpenPetFoodFactsProvider` | `25` | No (Free) | Pet food, treats & animal supplies |
| 6 | `openproductsfacts` | `OpenProductsFactsProvider` | `30` | No (Free) | Consumer electronics, household & general retail |
| 7 | `brocade` | `BrocadeProvider` | `35` | No (Free) | Open GTIN catalog (`brocade.io`) for general retail items |
| 8 | `upcitemdb` | `UpcItemDbProvider` | `40` | Optional (Free trial / Paid key) | General retail UPC/EAN catalog + lowest recorded price |
| 9 | `eansearch` | `EanSearchProvider` | `60` | Yes (`apiKey`) | Commercial global EAN/UPC/ISBN lookup (`ean-search.org`) |
| 10 | `barcodeLookup` | `BarcodeLookupProvider` | `70` | Yes (`apiKey`) | Commercial 700M+ product catalog (`barcodelookup.com`) |

---

## Enrichment strategies & ISBN routing

- **Automatic ISBN-13 (`978`/`979`) Priority Routing**: When a scanned barcode is detected as an ISBN-13, `ProviderRegistry.lookupChain` automatically promotes `GoogleBooksProvider` and `OpenLibraryProvider` to the front of the lookup queue.
- **`"first-hit"` strategy**: Stops and returns immediately on the highest-priority provider match for lowest latency.
- **`"deep-merge"` strategy**: Queries all active providers in priority order and merges non-null fields via `mergeNormalizedProducts` (backfilling missing descriptions, brands, ingredients, weights, suggested prices, and deduplicating image/category/author arrays).

---

## Writing a custom lookup provider

Extend `BaseBarcodeProvider` and register your custom ERP, PIM, or regional GTIN provider with `ProviderRegistry`:

```ts
import {
  BaseBarcodeProvider,
  BARCODE_MODULE,
  type BarcodeModuleService,
  type BarcodeSymbology,
  type NormalizedBarcodeProduct,
} from "medusa-plugin-barcode"

export class MyErpBarcodeProvider extends BaseBarcodeProvider {
  readonly name = "my_erp"

  constructor() {
    super({ priority: 5, timeout: 4000 })
  }

  async lookup(
    barcode: string,
    format: BarcodeSymbology
  ): Promise<NormalizedBarcodeProduct | null> {
    const data = await this.fetchJson<{ title?: string; brand?: string; price?: number }>(
      `https://erp.example.com/api/gtin/${encodeURIComponent(barcode)}`
    )
    if (!data?.title) return null

    return {
      barcode,
      barcode_type: format,
      name: data.title,
      description: null,
      brand: data.brand ?? null,
      manufacturer: data.brand ?? null,
      categories: ["ERP Catalog"],
      images: [],
      weight: null,
      weight_unit: null,
      dimensions: null,
      quantity_label: null,
      ingredients: null,
      nutrition: null,
      country_of_origin: null,
      suggested_price: data.price ?? null,
      currency_code: "USD",
      isbn: null,
      authors: [],
      publisher: null,
      published_date: null,
      page_count: null,
      provider: this.name,
      raw_data: data,
    }
  }
}

// Register at runtime:
const barcodeService = container.resolve(BARCODE_MODULE) as BarcodeModuleService
const registry = await barcodeService.getProviderRegistry()
registry.register(new MyErpBarcodeProvider())
```
