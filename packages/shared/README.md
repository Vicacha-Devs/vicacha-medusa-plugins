# @vicacha-devs/shared

Shared admin UI components, hooks, and utilities used across Vicacha Devs Medusa plugins. This is a **private internal package** — it is not published to npm and is consumed only by sibling packages in this monorepo.

## Contents

### Components (`/admin`)

| Export | Description |
|---|---|
| `ActionMenu` | Ellipsis-triggered dropdown for row/item actions |
| `ConditionalTooltip` | Wraps children in a tooltip only when a condition is met |
| `CoolSwitch` | Styled boolean toggle built on `@medusajs/ui` |
| `DeletePrompt` | Confirmation dialog for destructive actions |
| `FilterGroup` | Compound filter UI for list pages |
| `Form` | Wrapper around `react-hook-form` for consistent form layout |
| `JsonViewSection` | Collapsible JSON viewer section using `@uiw/react-json-view` |
| `RouteFocusModal` | Full-screen modal driven by the current route |
| `RouteDrawer` | Side-drawer driven by the current route |
| `StackedDrawer` | Drawer that layers on top of another drawer |
| `StackedFocusModal` | Focus modal that stacks on top of another modal |
| `RouteModalProvider` | Context provider for route-based modals |
| `StackedModalProvider` | Context provider for stacked modals |
| `RouteModalForm` | Form component scoped to a route modal |
| `Skeleton` | Loading skeleton placeholder |
| `DataTable` | Full-featured data table (search, filter, pagination) |
| `DataTableFilter` | Filter bar for `DataTable` (string, number, select variants) |
| `EmptyState` | Empty/no-results state for tables |
| `DateCell` | Table cell that formats a date value |
| `AmountCell` | Table cell that formats a monetary amount |
| `TextCell` | Plain text table cell |
| `PlaceholderCell` | Dash placeholder for missing values |
| `ProductCell` | Table cell with product thumbnail and title |
| `Thumbnail` | Image thumbnail with fallback |

### Hooks (`/admin`)

| Export | Description |
|---|---|
| `useDate` | Returns `getFullDate` and `getRelativeDate` helpers locale-aware via `react-i18next` |
| `useDataTable` | Wires up `@tanstack/react-table` state (sorting, pagination) for `DataTable` |
| `useDocumentDirection` | Reads the document's `dir` attribute (`ltr`/`rtl`) |
| `useQueryParams` | Reads and writes URL search params as typed values |

### Utilities (`/admin`)

| Export | Description |
|---|---|
| `formatAmount` | Formats a numeric amount as a locale-aware currency string via `Intl.NumberFormat` |
| `currencySymbolMap` | Maps ISO 4217 currency codes to their display symbols |

## Installation

This package is private and lives in the pnpm workspace. To add it to another plugin in this monorepo, declare it as a `devDependency` using the workspace protocol:

```json
// your-plugin/package.json
{
  "dependencies": {
    "@vicacha-devs/shared": "workspace:*"
  }
}
```

Then run `pnpm install` from the repo root to link it.

## Usage

The package exports a single admin entry point. Import from it using the package name:

```ts
import {
  ActionMenu,
  DataTable,
  useDate,
  formatAmount,
} from "@vicacha-devs/shared/admin"
```

> **Note:** Do not use `@/` path aliases when importing from this package inside plugin builds — `medusa plugin:build` does not resolve them. Always use relative imports within the package itself, and the package name from consumer plugins.

## Peer Dependencies

The following must be provided by the consuming plugin:

- `@medusajs/icons`
- `@medusajs/ui`
- `@tanstack/react-table`
- `@uiw/react-json-view`
- `react`
- `react-hook-form`
- `react-i18next`
- `react-router-dom`
- `zod`

## Development

This package is consumed as source (no build step). TypeScript compilation happens inside each consuming plugin's build. To add a new export, create the file under `src/admin/` and re-export it from the appropriate `index.ts`.
