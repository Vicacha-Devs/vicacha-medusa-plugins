# Admin (`src/admin`)

Medusa v2 Admin extension — multi-route pages built with `LayoutComposer`, decoupled single-responsibility section components (`< 170` lines per file), shared table/form primitives, and React Query hooks for `@vicacha-devs/medusa-plugin-b2b`.

```text
admin/
├── tsconfig.json
├── validators.ts                           # Barrel re-exporting all Admin UI form Zod schemas
├── i18n/                                   # react-i18next setup and locale JSON bundles
├── lib/
│   ├── client.ts                           # Medusa JS SDK client singleton
│   └── query-key-factory.ts                # React Query key builder
├── hooks/
│   ├── api/                                # React Query hooks (companies, employees, quotes, approvals, etc.)
│   └── table/                              # Table filter, query, and column hooks
├── components/
│   └── common/                             # Shared UI primitives (DataTable, Form, RouteFocusModal, ActionMenu, etc.)
├── routes/
│   └── b2b/
│       ├── page.tsx                        # /b2b — Overview dashboard (renders B2BOverviewSection)
│       ├── components/
│       │   └── b2b-overview-section.tsx    # KPI stat cards & quick-navigation cards
│       ├── companies/
│       │   ├── page.tsx                    # /b2b/companies — Companies list & create drawer
│       │   ├── components/
│       │   │   ├── company-form.tsx
│       │   │   ├── company-actions-menu.tsx
│       │   │   └── employees/              # Employee table, create/edit drawers, and form fields
│       │   └── [companyId]/
│       │       ├── page.tsx                # /b2b/companies/:companyId (TWO_COLUMN_SEVEN_FIVE layout)
│       │       └── components/
│       │           ├── company-details-Section.tsx
│       │           ├── company-edit-section.tsx
│       │           ├── company-employees-section.tsx
│       │           ├── company-customer-group-section.tsx
│       │           └── company-approval-settings-section.tsx
│       ├── quotes/
│       │   ├── page.tsx                    # /b2b/quotes — Quotes list (renders QuoteTableSection)
│       │   ├── components/
│       │   │   ├── quote-table-section.tsx
│       │   │   ├── quote-details/
│       │   │   │   ├── quote-details-main-section.tsx
│       │   │   │   ├── quote-details-sidebar-section.tsx
│       │   │   │   ├── quote-items.tsx
│       │   │   │   ├── quote-cost-breakdown.tsx
│       │   │   │   └── quote-messages.tsx
│       │   │   └── quote-manage/
│       │   │       ├── quote-manage-form-section.tsx
│       │   │       ├── manage-quote-form.tsx
│       │   │       ├── manage-item.tsx
│       │   │       └── manage-items-section.tsx
│       │   └── [quoteId]/
│       │       ├── page.tsx                # /b2b/quotes/:quoteId (TWO_COLUMN_SEVEN_FIVE layout)
│       │       └── manage/
│       │           └── page.tsx            # /b2b/quotes/:quoteId/manage
│       └── approvals/
│           ├── page.tsx                    # /b2b/approvals — Cart approval queue
│           └── components/
│               └── approval-actions.tsx
└── utils/                                  # Currency, date, and error formatting utilities
```

---

## Layout & Component Architecture

1. **`LayoutComposer` Integration**:
   - Single-column list and overview pages (`/b2b`, `/b2b/companies`, `/b2b/quotes`, `/b2b/approvals`) use `CORE_LAYOUT_IDS.SINGLE_COLUMN`.
   - Detail pages (`/b2b/companies/:companyId`, `/b2b/quotes/:quoteId`) use `CORE_LAYOUT_IDS.TWO_COLUMN_SEVEN_FIVE` (`main` + `sidebar` zones).
2. **Decoupled Single-Responsibility Sections**:
   - Route `page.tsx` files act purely as layout orchestrators, delegating forms, tables, and drawers to dedicated section components under `components/` (`< 170` lines per file).
3. **Data Fetching (`hooks/api/`)**:
   - All server communication uses React Query hooks (`useCompanies`, `useCompany`, `useEmployees`, `useQuotes`, `useQuote`, `useApprovals`, etc.) backed by the Medusa JS SDK (`lib/client.ts`).
