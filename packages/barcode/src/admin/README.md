# Admin

Medusa Admin extension — multi-route pages, drawer modals, product detail widgets, decoupled presentation components, and state hooks for `medusa-plugin-barcode`.

```sh
admin/
├── tsconfig.json                         TypeScript config (moduleResolution: bundler, noEmit: true)
├── vite-env.d.ts                         Vite ambient client type declarations
├── i18n/                                 react-i18next setup and 10-locale translation bundles
├── hooks/
│   ├── use-barcode-studio.ts             Studio state, SDK queries, mutations, HID scanner & i18n
│   └── use-product-barcodes.ts           Product detail widget state, variant EAN-13 gen & label print
├── components/
│   ├── index.tsx                         Barrel re-exporting all Admin UI presentation components
│   ├── overview-cards.tsx                StatCard and NavigationCard components for studio overview
│   ├── barcode-studio-header.tsx         BarcodeStudioHeader with language switcher, HID scan badge & KPIs
│   ├── gtin-lookup-section.tsx           GtinLookupLookupSection and GtinLookupTab
│   ├── batch-import-section.tsx          GtinLookupBatchSection (Textarea + recently linked Table)
│   ├── dynamic-qr-tag-drawer-form.tsx    RouteDrawer + KeyboundForm + Form tag creator
│   ├── dynamic-qr-tag-form.tsx           DynamicQrTagCreateSection inline tag form
│   ├── dynamic-qr-tags-table.tsx         DynamicQrTagsTableSection and DynamicQrTagsTab
│   ├── label-designer-section.tsx        LabelPrintDesignerSection and LabelPrintCenterTab
│   ├── label-output-section.tsx          LabelPrintOutputSection (ZPL II & HTML+SVG Textarea preview)
│   ├── stock-take-scanner-section.tsx    StockTakeControlsSection and WarehouseStockTakeTab
│   ├── stock-take-sessions-section.tsx   StockTakeSessionsSection (SectionRow + variance Table)
│   ├── providers-overview-section.tsx    ProvidersRegistrySection and ProvidersCacheTab
│   ├── providers-cache-table.tsx         ProvidersCacheSection (cached lookups Table + purge controls)
│   └── product-barcode-card.tsx          ProductBarcodeCard rendered in product.details.after widget
├── routes/
│   └── barcodes/                         Page routes registered in the Medusa Admin shell
│       ├── page.tsx                      /barcodes — Overview dashboard (SINGLE_COLUMN LayoutComposer)
│       ├── lookup/
│       │   └── page.tsx                  /barcodes/lookup — GTIN Lookup & Batch Importer (TWO_COLUMN)
│       ├── tags/
│       │   ├── page.tsx                  /barcodes/tags — Dynamic 1D/2D & HMAC QR Tags (TWO_COLUMN)
│       │   └── @create/
│       │       └── page.tsx              /barcodes/tags/create — RouteDrawer modal for creating tags
│       ├── print/
│       │   └── page.tsx                  /barcodes/print — Thermal & Sheet Label Designer (TWO_COLUMN)
│       ├── stock-take/
│       │   └── page.tsx                  /barcodes/stock-take — Warehouse Stock-Take Scanner (TWO_COLUMN)
│       └── providers/
│           └── page.tsx                  /barcodes/providers — Providers & Lookup Cache (TWO_COLUMN)
└── widgets/
    └── product-barcode-widget.tsx        Product detail widget (zone: "product.details.after")
```

---

## Route registration

The root `/barcodes` page (`routes/barcodes/page.tsx`) exports a `config` object created with `defineRouteConfig` from `@medusajs/admin-sdk` to register the sidebar navigation item, and each sub-route exports a `handle.breadcrumb` component:

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"

export const config = defineRouteConfig({
  label: "nav.label",
  translationNs: "barcodes",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}
```

| Route File | Admin Path | Layout Mode | Purpose |
| --- | --- | --- | --- |
| `routes/barcodes/page.tsx` | `/app/barcodes` | `SINGLE_COLUMN` | Studio overview KPIs & navigation cards to sub-routes |
| `routes/barcodes/lookup/page.tsx` | `/app/barcodes/lookup` | `TWO_COLUMN` | Single GTIN/ISBN lookup, 1-click product creation & batch importer |
| `routes/barcodes/tags/page.tsx` | `/app/barcodes/tags` | `TWO_COLUMN` | Dynamic 1D/2D barcode & HMAC-SHA256 QR tag management |
| `routes/barcodes/tags/@create/page.tsx` | `/app/barcodes/tags/create` | `RouteDrawer` | Drawer modal form (`KeyboundForm` + `Form`) to create signed tags |
| `routes/barcodes/print/page.tsx` | `/app/barcodes/print` | `TWO_COLUMN` | Thermal roll & A4 sheet price/barcode label designer (HTML+SVG & ZPL II) |
| `routes/barcodes/stock-take/page.tsx` | `/app/barcodes/stock-take` | `TWO_COLUMN` | Warehouse stock-take count sessions, live scan variance & reconciliation |
| `routes/barcodes/providers/page.tsx` | `/app/barcodes/providers` | `TWO_COLUMN` | 10-provider chain status & `barcode_cache` inspection/purging |

---

## Widget registration

`widgets/product-barcode-widget.tsx` registers in the `product.details.after` injection zone using `defineWidgetConfig`:

```tsx
import { defineWidgetConfig } from "@medusajs/admin-sdk"

export const config = defineWidgetConfig({
  zone: "product.details.after",
})
```

It delegates state and API mutations to `useProductBarcodes(productId)` and renders `<ProductBarcodeCard />` for one-click GS1 in-store (`200`–`299`) variant EAN-13 generation and thermal label printing.

---

## State & data-fetching hooks

All Admin routes and widgets remain thin entrypoints and delegate state management, hardware HID keyboard-wedge scanning (`useHidBarcodeScanner`), and API calls to hooks in `hooks/`:

| Hook | File | Responsibilities |
| --- | --- | --- |
| `useBarcodeStudio` | `hooks/use-barcode-studio.ts` | Manages studio overview state, single/batch GTIN lookups, dynamic tag creation/deletion, thermal/A4 label rendering, warehouse count sessions, cache purging, USB HID scanner routing, and active UI locale (`en`, `es`, `fr`, `de`, `it`, `pt`, `nl`, `pl`, `tr`, `ar` with RTL direction). |
| `useProductBarcodes` | `hooks/use-product-barcodes.ts` | Fetches `BarcodeProduct` mappings and `BarcodeTag` rows for a specific Medusa product ID, triggers `POST /admin/barcodes/bulk-generate` for missing variant barcodes, and prints `thermal_50x25` labels. |

---

## Decoupled presentation components

Located in `components/`. Every component file is kept modular and concise (< 170 lines per file), using `@medusajs/ui` primitives (`Container`, `Heading`, `Text`, `Table`, `Badge`, `Button`, `Input`, `Select`, `Textarea`, `Toaster`) and `@medusajs/dashboard/components` (`LayoutComposer`, `SectionRow`, `RouteDrawer`, `KeyboundForm`, `Form`).

| Component File | Exported Components | Purpose |
| --- | --- | --- |
| `overview-cards.tsx` | `StatCard`, `NavigationCard` | KPI metric cards and clickable sub-route navigation cards |
| `barcode-studio-header.tsx` | `BarcodeStudioHeader` | Studio header with 10-locale selector, HID scan indicator & bulk EAN-13 button |
| `gtin-lookup-section.tsx` | `GtinLookupLookupSection`, `GtinLookupTab` | Single GTIN/ISBN lookup form, strategy selector (`first-hit` / `deep-merge`) & product preview |
| `batch-import-section.tsx` | `GtinLookupBatchSection` | Multi-line batch GTIN importer (up to 100 codes) & recently linked products table |
| `dynamic-qr-tag-drawer-form.tsx` | `DynamicQrTagDrawerForm` | `react-hook-form` + Zod drawer form inside `RouteDrawer` for creating tags |
| `dynamic-qr-tag-form.tsx` | `DynamicQrTagCreateSection` | Inline card form for creating 1D/2D & anti-counterfeit HMAC QR tags |
| `dynamic-qr-tags-table.tsx` | `DynamicQrTagsTableSection`, `DynamicQrTagsTab` | Table of generated tags with SVG preview, scan count, HMAC seal & delete action |
| `label-designer-section.tsx` | `LabelPrintDesignerSection`, `LabelPrintCenterTab` | Preset selector (7 thermal/A4 layouts), MRP/Sale price inputs & print trigger |
| `label-output-section.tsx` | `LabelPrintOutputSection` | Print-ready HTML+SVG window launcher and raw Zebra ZPL II (`^XA...^XZ`) output |
| `stock-take-scanner-section.tsx` | `StockTakeControlsSection`, `WarehouseStockTakeTab` | New count session form and rapid barcode scan (`+1` / `-1`) controls |
| `stock-take-sessions-section.tsx` | `StockTakeSessionsSection` | Active/completed stock-take sessions list, variance badges & Inventory Module apply action |
| `providers-overview-section.tsx` | `ProvidersRegistrySection`, `ProvidersCacheTab` | Displays the 10 external GTIN/ISBN lookup providers and priorities |
| `providers-cache-table.tsx` | `ProvidersCacheSection` | Displays `barcode_cache` entries, hit counts, expiration & purge actions |
| `product-barcode-card.tsx` | `ProductBarcodeCard` | Product detail widget UI for variant EAN-13 assignment and label printing |
| `index.tsx` | Barrel re-exports | Re-exports all presentation components |

---

## i18n

Translations are configured in `i18n/` with 10 built-in locales (`ar`, `de`, `en`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `tr`) and automatic RTL support for Arabic (`ar`). See [`i18n/README.md`](./i18n/README.md) for details on adding translation keys and locales.