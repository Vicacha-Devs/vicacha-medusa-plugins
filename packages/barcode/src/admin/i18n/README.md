# i18n

Internationalisation setup for the `medusa-plugin-barcode` Admin extension using [react-i18next](https://react.i18next.com/).

```sh
i18n/
├── index.ts          exports SUPPORTED_UI_LOCALES and the 10-locale translation map
└── json/             one JSON file per supported locale
    ├── ar.json       Arabic (العربية — RTL)
    ├── de.json       German (Deutsch)
    ├── en.json       English (default)
    ├── es.json       Spanish (Español)
    ├── fr.json       French (Français)
    ├── it.json       Italian (Italiano)
    ├── nl.json       Dutch (Nederlands)
    ├── pl.json       Polish (Polski)
    ├── pt.json       Portuguese (Português)
    └── tr.json       Turkish (Türkçe)
```

---

## Supported locales

All 10 locales are exported in `SUPPORTED_UI_LOCALES` and registered under both the default `translation` namespace and the plugin's `barcodes` namespace (`translationNs: "barcodes"`):

| Code | Language | Native Label | Direction | File |
| --- | --- | --- | --- | --- |
| `en` | English | English | `ltr` | `json/en.json` |
| `es` | Spanish | Español | `ltr` | `json/es.json` |
| `fr` | French | Français | `ltr` | `json/fr.json` |
| `de` | German | Deutsch | `ltr` | `json/de.json` |
| `it` | Italian | Italiano | `ltr` | `json/it.json` |
| `pt` | Portuguese | Português | `ltr` | `json/pt.json` |
| `nl` | Dutch | Nederlands | `ltr` | `json/nl.json` |
| `pl` | Polish | Polski | `ltr` | `json/pl.json` |
| `tr` | Turkish | Türkçe | `ltr` | `json/tr.json` |
| `ar` | Arabic | العربية | `rtl` | `json/ar.json` |

---

## Adding a translation key

1. Add the key to `json/en.json` and to the remaining 9 locale files in `json/*.json`.
2. Reference the key in any admin component or hook via `useTranslation("barcodes")` or the `t` helper returned by `useBarcodeStudio` / `useProductBarcodes`:

```tsx
import { useTranslation } from "react-i18next"

const MyComponent = () => {
  const { t } = useTranslation("barcodes")
  return <span>{t("header.title")}</span>
}
```

---

## Adding a new locale

1. Create `json/<locale>.json` with the exact same nested key structure as `json/en.json`.
2. Import the JSON file in `index.ts`, append the locale entry to `SUPPORTED_UI_LOCALES`, and register it in the default export under both `translation` and `barcodes`:

```ts
import ja from "./json/ja.json"

export const SUPPORTED_UI_LOCALES = [
  // ...existing locales
  { code: "ja", label: "日本語" },
] as const

export default {
  // ...existing locales
  ja: { translation: ja, barcodes: ja },
}
```

3. Medusa's admin shell and the in-studio language selector pick up the new locale automatically.

---

## RTL layout support (`ar`)

When Arabic (`ar`) is selected in the Admin Studio header or Product Detail Widget, `useBarcodeStudio` and `useProductBarcodes` compute `dir = locale === "ar" ? "rtl" : "ltr"` and pass `dir={s.dir}` to the root `<Container>`, enabling automatic right-to-left layout alignment across tables, forms, and headers.

---

## Key structure (`"barcodes"` namespace)

Keys are organised by feature domain inside each `json/<locale>.json` file and registered under the `"barcodes"` namespace:

```json
{
  "nav": {
    "label": "Barcode & Label Studio"
  },
  "header": {
    "title": "Barcode, QR, Thermal Label & Inventory Studio",
    "providersBadge": "GS1 + 10 Providers Active",
    "bulkGenerateButton": "Auto-Assign Missing Variant EAN-13s"
  },
  "tabs": {
    "lookup": "1. GTIN Lookup & Batch Importer ({{count}})",
    "tags": "2. Dynamic 1D/2D & HMAC QR Tags ({{count}})",
    "print": "3. Thermal & Sheet Label Print Center",
    "stockTake": "4. Warehouse Stock-Take ({{count}})",
    "providers": "5. Providers & Cache ({{count}})"
  },
  "lookupTab": {
    "lookupTitle": "1. Scan or Enter GTIN / EAN-13 / UPC-A / ISBN-13",
    "batchTitle": "Batch GTIN / ISBN Catalog Importer"
  },
  "tagsTab": {
    "createTitle": "Create 1D Barcode / 2D Dynamic QR / Anti-Counterfeit Tag"
  },
  "printTab": {
    "designerTitle": "Thermal Roll & A4 Sheet Price/Barcode Label Designer"
  },
  "stockTakeTab": {
    "startTitle": "Start New Warehouse Stock-Take Session",
    "rapidScannerTitle": "Rapid Barcode Scanner (Count Session)"
  },
  "providersTab": {
    "providersTitle": "10 Built-In External GTIN / ISBN Lookup Providers",
    "cacheTitle": "Lookup Cache Entries ({{count}})"
  },
  "widget": {
    "title": "Product Barcodes, Dynamic QR & Thermal Labels"
  }
}
```