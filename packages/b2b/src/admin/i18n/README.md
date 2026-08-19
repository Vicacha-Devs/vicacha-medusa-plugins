# i18n

Internationalisation setup for the B2B admin extension using [react-i18next](https://react.i18next.com/).

```
i18n/
├── index.ts          initialises i18next and exports the translation map
└── json/             one JSON file per locale
    └── en.json       English (default)
```

---

## Adding a translation key

1. Add the key to `json/en.json` (and to any other locale files that already exist).
2. Use it in any admin component via the `useTranslation` hook:

```tsx
import { useTranslation } from "react-i18next"

const MyComponent = () => {
  const { t } = useTranslation()
  return <span>{t("companies.title")}</span>
}
```

## Adding a new locale

1. Create `json/<locale>.json` with the same key structure as `en.json`.
2. Import it in `index.ts` and add it to the exported map:

```ts
import en from "./json/en.json" with { type: "json" }
import es from "./json/es.json" with { type: "json" }

export default {
  en: { translation: en },
  es: { translation: es },
}
```

3. Medusa's admin shell picks up the additional locale automatically — no further registration is required.

## Planned locales

The roadmap targets `en`, `es`, `tr`, and `ar`. Arabic (`ar`) requires RTL layout support — test layout direction when adding it.

## Key structure

Keys are organised by domain, not by component, so that related strings stay together regardless of where they are rendered:

```json
{
  "companies": {
    "title": "Companies",
    "empty": "No companies yet",
    "create": "Create company"
  },
  "employees": {
    "title": "Employees",
    "spending_limit": "Spending limit"
  },
  "quotes": {
    "title": "Quotes",
    "status": {
      "pending_merchant": "Pending review",
      "pending_customer": "Pending customer",
      "accepted": "Accepted",
      "customer_rejected": "Rejected by customer",
      "merchant_rejected": "Rejected"
    }
  },
  "approvals": {
    "title": "Approvals"
  }
}
```
