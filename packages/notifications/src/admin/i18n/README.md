# i18n

Internationalization setup for the Notification Studio Admin extension using [`react-i18next`](https://react.i18next.com/).

```sh
i18n/
├── index.ts          Initializes and exports the 10-locale translation map
└── json/             One JSON file per locale
    ├── ar.json       Arabic (RTL)
    ├── de.json       German
    ├── en.json       English (default)
    ├── es.json       Spanish
    ├── fr.json       French
    ├── it.json       Italian
    ├── nl.json       Dutch
    ├── pl.json       Polish
    ├── pt.json       Portuguese
    └── tr.json       Turkish
```

---

## Supported Locales & RTL Support

Both the Admin UI (`src/admin/i18n/json/`) and the backend template renderer (`src/modules/notifications/i18n/locales/`) ship with **10 built-in locales**:

| Code | Language | Direction |
| --- | --- | --- |
| `en` | English | `ltr` |
| `es` | Spanish | `ltr` |
| `pl` | Polish | `ltr` |
| `de` | German | `ltr` |
| `fr` | French | `ltr` |
| `it` | Italian | `ltr` |
| `nl` | Dutch | `ltr` |
| `pt` | Portuguese | `ltr` |
| `tr` | Turkish | `ltr` |
| `ar` | Arabic | `rtl` (`isRtlLocale("ar") === true`) |

When Arabic (`ar`) is active, the Notification Studio automatically sets `dir="rtl"` on the container and preview surfaces so forms, tables, and rendered templates align right-to-left.

---

## Adding a Translation Key

1. Add the key to `json/en.json` and the other 9 locale files in `json/*.json`.
2. Reference the key in any Admin route, component, or widget via `useTranslation` (or the studio `t` helper scoped to `"mpn"`):

```tsx
import { useTranslation } from "react-i18next"

export const StudioHeader = () => {
  const { t } = useTranslation("mpn")
  return <span>{t("header.title")}</span>
}
```

---

## Adding a New Locale

1. Create `json/<locale>.json` with the same key hierarchy as `json/en.json`.
2. Import it in `src/admin/i18n/index.ts` and add it to the default export map:

```ts
import ar from "./json/ar.json"
import en from "./json/en.json"
import ja from "./json/ja.json"

export default {
  ar: { translation: ar },
  en: { translation: en },
  ja: { translation: ja },
}
```

3. If the locale is right-to-left, add its code to `RTL_LOCALES` in `src/modules/notifications/i18n/index.ts`.

---

## Key Structure (`mpn` Namespace)

All Admin UI translation keys are organized by functional domain so related labels stay grouped across routes and components:

```json
{
  "nav": {
    "label": "Notifications"
  },
  "header": {
    "title": "Multi-Channel Notification Studio (Email, WhatsApp/OpenWA, Telegram, SMS, Slack)",
    "subtitle": "Visual Block & Raw Template Builder, DB Event Mappings, Multi-Driver Gateways, Consent Ledger, and Dummy OTP Sandbox.",
    "refresh": "Refresh Studio"
  },
  "tabs": {
    "templates": "Templates & Visual Builder ({{count}})",
    "mappings": "Event Mappings ({{count}})",
    "channels": "Channels (OpenWA / Telegram / SMS)",
    "logs": "Delivery Logs ({{count}})",
    "broadcasts": "Broadcasts & Consent Ledger",
    "sandbox": "Dummy OTP Sandbox ({{count}})"
  },
  "templates": {
    "title": "Templates",
    "inspectPreview": "Inspect / Preview",
    "cloneToDb": "Clone to DB",
    "saveButton": "Save Template & Blocks"
  },
  "mappings": {
    "title": "Create Event → Channel → Template Mapping",
    "addMappingButton": "Add Active Mapping"
  },
  "channels": {
    "whatsappTitle": "WhatsApp & OpenWA Gateway",
    "telegramTitle": "Telegram Notifications",
    "smsTitle": "SMS Carrier Driver"
  },
  "logs": {
    "title": "Redacted Delivery Ledger (PII Masked & Idempotent)"
  },
  "broadcasts": {
    "title": "Customer Group Broadcasts",
    "consentTitle": "TCPA / 10DLC & Bot Consent Ledger"
  },
  "sandbox": {
    "title": "Dummy OTP & Multi-Channel Sandbox",
    "clearButton": "Clear Sandbox"
  },
  "widget": {
    "title": "Multi-Channel Notifications",
    "sendButton": "Send Notification"
  }
}
```
