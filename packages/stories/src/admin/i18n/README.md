# i18n

Internationalisation setup for the Shoppable Stories admin extension using [react-i18next](https://react.i18next.com/).

```
i18n/
├── index.ts          exports SUPPORTED_UI_LOCALES and the 10-locale translation map
└── json/             one JSON file per locale
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

## Supported locales

Each locale is registered under both the default `translation` namespace and the `"stories"` namespace (used by `defineRouteConfig({ translationNs: "stories" })`):

| Code | Language | Direction |
| --- | --- | --- |
| `en` | English | LTR |
| `es` | Español | LTR |
| `fr` | Français | LTR |
| `de` | Deutsch | LTR |
| `it` | Italiano | LTR |
| `pt` | Português | LTR |
| `nl` | Nederlands | LTR |
| `pl` | Polski | LTR |
| `tr` | Türkçe | LTR |
| `ar` | العربية | RTL |

---

## Adding a translation key

1. Add the key to `json/en.json` and all 9 other locale files in `json/`.
2. Reference it in any admin route, widget, or component via `useTranslation`:

```tsx
import { useTranslation } from "react-i18next"

const MyComponent = () => {
  const { t } = useTranslation()
  return <span>{t("header.title")}</span>
}
```

---

## Key structure

Keys are organised by domain section:

```json
{
  "nav": {
    "label": "Shoppable Stories"
  },
  "header": {
    "title": "9:16 Shoppable Stories Studio",
    "subtitle": "Manage Story Highlight Rings, interactive product hotspots, engagement stickers & conversion funnel analytics",
    "refresh": "Refresh"
  },
  "tabs": {
    "canvas": "9:16 Canvas & Hotspots",
    "rings": "Highlight Rings",
    "stickers": "Interactive Stickers",
    "analytics": "Funnel Analytics"
  },
  "canvasTab": { ... },
  "ringsTab": { ... },
  "stickersTab": { ... },
  "analyticsTab": { ... },
  "widget": { ... }
}
```
