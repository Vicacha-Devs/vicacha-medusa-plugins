# Admin

Medusa Admin extension — pages, order sidebar widget, decoupled section components, and React Query hooks for `@vicacha-devs/medusa-plugin-documents`.

```sh
admin/
├── tsconfig.json                            TypeScript config (moduleResolution: bundler, noEmit: true)
├── vite-env.d.ts                            Vite client type declarations
├── i18n/                                    react-i18next setup and 10 locale translation files
│   ├── index.ts                             Exports 10-locale translation bundle
│   └── json/                                ar, de, en, es, fr, it, nl, pl, pt, tr JSON files
├── components/
│   └── documents/                           Decoupled UI section, table, row, and form components
│       ├── index.ts                         Barrel re-exporting all document admin components
│       ├── constants.ts                     SUPPORTED_UI_LOCALES, DEFAULT_SETTINGS_VALUES, and documentSettingsFormSchema
│       ├── documents-overview-section.tsx   StatCards + NavigationCards for the Documents Hub
│       ├── documents-filters-bar.tsx        Type, status, date range, search, CSV export, and ZIP download controls
│       ├── documents-table-section.tsx      Paginated/filtered document list container
│       ├── documents-table-row.tsx          Individual document table row with selection checkbox and PDF action
│       ├── documents-bulk-generate-section.tsx  Inline batch generation CTA card linking to the RouteDrawer
│       ├── order-document-row.tsx           Order sidebar row with PDF, Email, Revision, Retry, Signature, and Audit actions
│       ├── order-document-audit-panel.tsx   Expandable audit trail and prior immutable versions panel
│       ├── settings-company-section.tsx     Company identity, branding colors, presets, notes, and bank details form section
│       ├── settings-numbering-section.tsx   Format tokens, live preview, and forced next number sequence controls
│       ├── settings-preview-section.tsx     Live PDF iframe preview (4-item mock, 75-item stress test, or real Order ID)
│       ├── settings-region-scope-section.tsx  Global vs. per-region override selector and reset action
│       └── settings-automation-section.tsx  Auto-generate, auto-email, and Docuseal signature switches
├── routes/
│   └── documents/                           Page routes registered in the Medusa admin shell
│       ├── page.tsx                         /documents — Overview & Documents Hub (SINGLE_COLUMN)
│       ├── @bulk-generate/
│       │   └── page.tsx                     /documents/bulk-generate — RouteDrawer modal for batch generation
│       └── settings/
│           └── page.tsx                     /documents/settings — Settings & Template Studio (TWO_COLUMN)
└── widgets/
    └── order-documents-widget.tsx           Order detail sidebar widget (order.details.side.after)
```

---

## Route registration & layout conventions

Each route `page.tsx` exports a `config` object created with `defineRouteConfig` and a `handle.breadcrumb` function for the Medusa v2 dashboard breadcrumb bar, and composes its sections with `<LayoutComposer>` from `@medusajs/dashboard/components`:

```tsx
export const config = defineRouteConfig({
  label: "nav.label",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}
```

| Route | File | Layout / Container | Purpose |
| --- | --- | --- | --- |
| `/documents` | `routes/documents/page.tsx` | `CORE_LAYOUT_IDS.SINGLE_COLUMN` (`widgetsZonePrefix="documents.list"`) | Accounting & Documents Hub: overview stats, filterable table, CSV export, bulk ZIP download, and batch generation trigger |
| `/documents/bulk-generate` | `routes/documents/@bulk-generate/page.tsx` | `<RouteDrawer>` + `useRouteModal` + `<KeyboundForm>` | Slide-over drawer modal to batch-generate documents across multiple comma/space-separated Order IDs |
| `/documents/settings` | `routes/documents/settings/page.tsx` | `CORE_LAYOUT_IDS.TWO_COLUMN` (`widgetsZonePrefix="documents.settings"`) | Document Settings & Template Studio: company branding, numbering tokens, live PDF preview (`main`), and region scope + automation toggles (`side`) |

---

## Widgets

| Widget | File | Injection Zone | Purpose |
| --- | --- | --- | --- |
| `OrderDocumentsWidget` | `widgets/order-documents-widget.tsx` | `order.details.side.after` | Displays order documents, stale revision alerts, on-demand generation by type/locale, PDF download, email delivery, Docuseal signature dispatch, and expandable audit history |

---

## Decoupled components (`src/admin/components/documents/`)

All view sections and row components are decoupled into `src/admin/components/documents/` and re-exported from `src/admin/components/documents/index.ts`.

| File | Exported Symbols | Purpose |
| --- | --- | --- |
| `constants.ts` | `SUPPORTED_UI_LOCALES`, `DEFAULT_SETTINGS_VALUES`, `documentSettingsFormSchema`, `DocumentSettingsFormValues` | Shared UI locale options, default settings values, and Zod schema for the settings form |
| `documents-overview-section.tsx` | `DocumentsOverviewSection` | Renders summary `StatCard`s (total, generated, stale, failed) and quick `NavigationCard` links |
| `documents-filters-bar.tsx` | `DocumentsFiltersBar` | Renders search input, document type & status selects, date range filters, CSV export button, and bulk ZIP button |
| `documents-table-section.tsx` | `DocumentsTableSection` | Composes `DocumentsFiltersBar` and the multi-select table of generated documents |
| `documents-table-row.tsx` | `DocumentsTableRow` | Renders a single document row with status/stale badges, order link, region badge, and PDF download button |
| `documents-bulk-generate-section.tsx` | `DocumentsBulkGenerateSection` | Card section with quick inline or drawer-based batch generation trigger |
| `order-document-row.tsx` | `OrderDocumentRow` | Renders a document entry inside `OrderDocumentsWidget` with action buttons (`View PDF`, `Email`, `New Revision`, `Retry`, `Send for Signature`, `Audit Log`) |
| `order-document-audit-panel.tsx` | `OrderDocumentAuditPanel` | Expandable panel displaying the immutable `audit_log` timeline, `prior_versions` archive links, and custom recipient override input |
| `settings-company-section.tsx` | `SettingsCompanySection` | Form fields for company identity, tax ID, logo, primary color, preset templates (`clean`, `classic`, `compact`, `pos_80mm`, `pos_58mm`), notes, and bank details |
| `settings-numbering-section.tsx` | `SettingsNumberingSection` | Form fields for invoice/packing slip/credit note format strings, live formatted number preview, and forced next invoice number |
| `settings-preview-section.tsx` | `SettingsPreviewSection` | Live interactive PDF preview section supporting 4-item standard mock, 75-item multi-page stress test, or real Medusa `order_id` |
| `settings-region-scope-section.tsx` | `SettingsRegionScopeSection` | Side column selector for switching between `Global Default` and per-region overrides (`region_id`), with reset-to-global support |
| `settings-automation-section.tsx` | `SettingsAutomationSection` | Side column `SectionRow` + `Switch` toggles for `auto_generate_*`, `auto_email_*`, and `require_signature` |
| `index.ts` | `*` | Barrel file re-exporting all components and constants above |

---

## Data fetching (`src/hooks/` & `src/sdk/`)

Admin routes and widgets never call `fetch()` directly. Instead, they consume typed hooks from `src/hooks/` backed by the isomorphic SDK client in `src/sdk/`:

- **SDK (`src/sdk/`)**:
  - `documentsAdminSdk` / `createDocumentsAdminSdk()` (`src/sdk/client.ts`): Typed methods for all `/admin/documents/*` endpoints plus URL builders (`getDocumentPdfUrl`, `getPreviewPdfUrl`, `getExportCsvUrl`).
  - `documentsQueryKeys` (`src/sdk/query-keys.ts`): Hierarchical cache key factory (`all`, `lists`, `list`, `details`, `detail`, `settings`, `templates`, `regions`, `storeOrder`).
- **Hooks (`src/hooks/`)**:
  - Queries: `useDocumentsList`, `useDocumentDetail`, `useDocumentSettings`, `useDocumentRegions`, `useDocumentTemplates`
  - Mutations: `useGenerateDocument`, `useRegenerateDocument`, `useSendDocumentEmail`, `useSendDocumentForSignature`, `useBulkGenerateDocuments`, `useBulkDownloadDocuments`, `useUpdateDocumentSettings`, `useResetRegionalDocumentSettings`, `useCreateDocumentTemplate`, `useUpdateDocumentTemplate`, `useDeleteDocumentTemplate`
  - Widget state controller: `useOrderDocumentsWidgetState` (`src/hooks/use-order-documents-widget-state.ts`) encapsulates all state, queries, and mutations for `OrderDocumentsWidget`.

---

## Navigation & i18n

- All internal navigation uses `useNavigate()` and `<Link>` from `react-router-dom` (e.g., `<Link to={`/orders/${doc.order_id}`}>`, `<Link to="/documents/settings">`).
- Translations are configured in `i18n/` using `react-i18next` across 10 locales (`ar`, `de`, `en`, `es`, `fr`, `it`, `nl`, `pl`, `pt`, `tr`) with automatic `dir="rtl"` layout switching when Arabic (`ar`) is active. See [`i18n/README.md`](./i18n/README.md) for details.
