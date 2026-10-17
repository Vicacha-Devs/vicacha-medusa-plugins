# i18n

Internationalization setup for the Odoo ERP Admin UI extension using [react-i18next](https://react.i18next.com/).

```sh
i18n/
├── index.ts          exports SUPPORTED_UI_LOCALES and registers all 10 locales under `translation` and `odoo` namespaces
└── json/             one JSON translation file per supported locale
    ├── ar.json       العربية (Arabic — RTL layout support)
    ├── de.json       Deutsch (German)
    ├── en.json       English (default)
    ├── es.json       Español (Spanish)
    ├── fr.json       Français (French)
    ├── it.json       Italiano (Italian)
    ├── nl.json       Nederlands (Dutch)
    ├── pl.json       Polski (Polish)
    ├── pt.json       Português (Portuguese)
    └── tr.json       Türkçe (Turkish)
```

---

## Supported Locales (`SUPPORTED_UI_LOCALES`)

`src/admin/i18n/index.ts` exports `SUPPORTED_UI_LOCALES` and registers every locale under both the default `translation` namespace and the plugin-scoped `odoo` namespace (`translationNs: "odoo"`):

| Code | Label | Direction | File |
| :--- | :--- | :---: | :--- |
| `en` | English | LTR | `json/en.json` |
| `es` | Español | LTR | `json/es.json` |
| `fr` | Français | LTR | `json/fr.json` |
| `de` | Deutsch | LTR | `json/de.json` |
| `it` | Italiano | LTR | `json/it.json` |
| `pt` | Português | LTR | `json/pt.json` |
| `nl` | Nederlands | LTR | `json/nl.json` |
| `pl` | Polski | LTR | `json/pl.json` |
| `tr` | Türkçe | LTR | `json/tr.json` |
| `ar` | العربية | **RTL** | `json/ar.json` |

---

## RTL Support for Arabic (`ar`)

When the user switches the Admin UI language to Arabic (`ar`) via the locale selector in `OdooHeader` (`src/admin/components/odoo-header.tsx`) or Medusa's Admin profile settings:
- Flex and grid layouts in the Odoo Admin routes and widgets respect document direction (`dir="rtl"` / logical alignment).
- Interpolated variables (such as `{{protocol}}`, `{{state}}`, `{{count}}`, `{{medusaId}}`, `{{odooId}}`, `{{latencyMs}}`) remain intact across RTL and LTR strings.

---

## Adding a Translation Key

1. Add the key to `json/en.json` and mirror it across the other 9 locale files in `json/*.json`.
2. Reference the key in any Admin route, widget, or component via `useTranslation()`:

```tsx
import { useTranslation } from "react-i18next"

export const ExampleSection = () => {
  const { t } = useTranslation()
  return <span>{t("header.title")}</span>
}
```

---

## Adding a New Locale

1. Create `src/admin/i18n/json/<locale>.json` with the exact same top-level and nested key structure as `src/admin/i18n/json/en.json`.
2. Import the JSON file in `src/admin/i18n/index.ts`, append the locale metadata to `SUPPORTED_UI_LOCALES`, and export it under both `translation` and `odoo` namespaces:

```ts
import en from "./json/en.json"
import ja from "./json/ja.json"

export const SUPPORTED_UI_LOCALES = [
  { code: "en", label: "English" },
  // ...
  { code: "ja", label: "日本語" },
] as const

export default {
  en: { translation: en, odoo: en },
  // ...
  ja: { translation: ja, odoo: ja },
}
```

---

## Key Structure (`odoo` Namespace)

All translation files share the same domain-organized structure registered under the `"odoo"` namespace (and mirrored on `"translation"`):

```json
{
  "nav": {
    "label": "Odoo ERP"
  },
  "header": {
    "title": "Odoo ERP Integration",
    "subtitle": "Bidirectional Products, Multi-Warehouse Inventory, Orders & Invoicing, Customers, Drift Reconciliation & POS Barcode Engine",
    "protocolBadge": "Protocol: {{protocol}}",
    "circuitBadge": "Circuit: {{state}}",
    "refresh": "Refresh",
    "syncAll": "Sync All Entities"
  },
  "tabs": {
    "overview": "Overview & Manual Sync",
    "connection": "Connection & Protocol",
    "settings": "Entity Sync Rules",
    "logs": "Logs, Failures & Conflicts",
    "barcode": "POS & Barcode"
  },
  "overviewTab": { "...": "KPI labels and manual sync button titles" },
  "connectionTab": { "...": "Odoo URL, DB, credentials, protocol, and SSRF toggle labels" },
  "settingsTab": { "...": "Product, Inventory, Orders/Invoicing, and Reconciliation settings labels" },
  "logsTab": { "...": "Dead-letter failures, inventory drift conflicts, and recent sync run table labels" },
  "barcodeTab": { "...": "POS & Warehouse barcode lookup and offline POS replay labels" },
  "widget": { "...": "Order Details (order.details.after) and Product Details (product.details.after) widget strings" },
  "messages": { "...": "Toast notification strings for success and error states" }
}
```
