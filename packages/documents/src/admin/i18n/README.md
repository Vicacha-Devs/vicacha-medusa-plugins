# i18n

Internationalization setup for the Documents admin extension using [react-i18next](https://react.i18next.com/) across 10 supported locales, including Right-to-Left (RTL) layout support for Arabic (`ar`).

```sh
i18n/
├── index.ts          Initializes and exports the 10-locale translation resource map
└── json/             One JSON file per locale (100% key parity enforced by tests)
    ├── ar.json       Arabic (العربية — RTL)
    ├── de.json       German (Deutsch)
    ├── en.json       English (Default)
    ├── es.json       Spanish (Español)
    ├── fr.json       French (Français)
    ├── it.json       Italian (Italiano)
    ├── nl.json       Dutch (Nederlands)
    ├── pl.json       Polish (Polski)
    ├── pt.json       Portuguese (Português)
    └── tr.json       Turkish (Türkçe)
```

---

## Supported locales & RTL support

All 10 locale files in `json/` maintain strict 1:1 structural key parity (verified in `src/__tests__/documents.spec.ts`):

| Code | Language | Direction | File |
| --- | --- | --- | --- |
| `ar` | Arabic (`العربية`) | `rtl` | `json/ar.json` |
| `de` | German (`Deutsch`) | `ltr` | `json/de.json` |
| `en` | English | `ltr` | `json/en.json` |
| `es` | Spanish (`Español`) | `ltr` | `json/es.json` |
| `fr` | French (`Français`) | `ltr` | `json/fr.json` |
| `it` | Italian (`Italiano`) | `ltr` | `json/it.json` |
| `nl` | Dutch (`Nederlands`) | `ltr` | `json/nl.json` |
| `pl` | Polish (`Polski`) | `ltr` | `json/pl.json` |
| `pt` | Portuguese (`Português`) | `ltr` | `json/pt.json` |
| `tr` | Turkish (`Türkçe`) | `ltr` | `json/tr.json` |

When the active language resolves to `ar` (`(i18n.resolvedLanguage || i18n.language || "").startsWith("ar")`), the Admin routes (`/documents`, `/documents/settings`) and `OrderDocumentsWidget` automatically set `dir="rtl"` on their root container.

---

## Adding a translation key

1. Add the key to `json/en.json` and to all 9 other locale files in `json/*.json` so that the i18n parity test (`npm test`) continues to pass.
2. Reference the key in any admin route, widget, or component via `useTranslation()`:

```tsx
import { useTranslation } from "react-i18next"

const MyComponent = () => {
  const { t } = useTranslation()
  return <span>{t("hub.title")}</span>
}
```

---

## Adding a new locale

1. Create `json/<locale>.json` with the exact same nested key structure as `json/en.json`.
2. Import it in `src/admin/i18n/index.ts` and add it to the default export:

```ts
import en from "./json/en.json"
import ja from "./json/ja.json"

export default {
  // ...existing locales
  en: { translation: en },
  ja: { translation: ja },
}
```

3. If the new locale is also supported by the server-side PDF renderer, add its translations to `src/modules/documents/i18n/locales/` and register the code in `SUPPORTED_LOCALES` (`src/types/constants.ts`) and `SUPPORTED_UI_LOCALES` (`src/admin/components/documents/constants.ts`).

---

## Key structure

Keys are organized by functional domain so related strings stay grouped across decoupled components:

```json
{
  "nav": {
    "label": "Documents"
  },
  "types": {
    "invoice": "Invoice",
    "packing_slip": "Packing Slip",
    "credit_note": "Credit Note",
    "receipt": "POS Receipt"
  },
  "statuses": {
    "all": "All Statuses",
    "generated": "Generated",
    "failed": "Failed",
    "draft": "Draft",
    "stale": "Stale"
  },
  "hub": {
    "title": "Commercial Documents & Accounting",
    "exportCsv": "Export CSV",
    "downloadZip": "Download Selected ZIP ({{count}})",
    "messages": {
      "loadError": "Failed to load documents",
      "bulkSuccess": "Bulk finished: {{generated}} generated, {{skipped}} skipped, {{failed}} failed"
    }
  },
  "settings": {
    "title": "Document Settings & Template Studio",
    "companySectionTitle": "Company Identity & Branding",
    "numberingSectionTitle": "Numbering Sequences & Formats",
    "automationSectionTitle": "Automation, Email Delivery & E-Signatures",
    "previewSectionTitle": "Live PDF Preview"
  },
  "widget": {
    "title": "Commercial Documents",
    "generateButton": "Generate {{type}}",
    "issueRevisionButton": "Issue v{{version}}"
  }
}
```