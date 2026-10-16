# CLAUDE.md — `@vicacha-devs/medusa-plugin-b2b`

## Project Overview

`@vicacha-devs/medusa-plugin-b2b` provides complete B2B commerce capabilities for **Medusa v2**: Companies (`b2b_company`), Employees with configurable spending limits, Customer Group price-list synchronization, Request-for-Quote negotiation (`b2b_quote`), multi-level Cart Approvals (`b2b_approval`), core cart/order workflow hooks, and a full `LayoutComposer`-based Admin UI.

---

## Architecture & Directory Layout

- `src/modules/` —
  - `company/`: `b2b_company` (`Company`, `Employee` models + `CompanyModuleService`).
  - `quote/`: `b2b_quote` (`Quote`, `Message` models + `QuoteModuleService`).
  - `approval/`: `b2b_approval` (`Approval`, `ApprovalSettings`, `ApprovalStatus` models + `ApprovalModuleService`).
- `src/links/` — Remote links between `Company`, `Employee`, `Approval`, `ApprovalSettings`, `ApprovalStatus`, `Quote`, and Medusa core `Customer`, `CustomerGroup`, `Cart`, `Order`, `OrderChange`.
- `src/workflows/` —
  - `companies/`, `employees/`, `quotes/`, `approvals/`, `order-edits/`: Compensated Medusa workflows (`createWorkflow` + `createStep`).
  - `hooks/`: Core workflow hooks (`cart-created`, `order-created`, `add-to-cart`, `update-cart`, `complete-cart`).
- `src/api/` —
  - `validators.ts` & `middlewares.ts`: Zod validation schemas and `ensureRole("company_admin")` guards.
  - `admin/b2b/*`: Admin endpoints for companies, employees, quotes, and approvals.
  - `store/b2b/*`: Storefront endpoints for companies, employees, quotes, carts, approvals, and free-shipping thresholds.
- `src/admin/` —
  - `routes/b2b/`: Multi-route Admin UI built with `LayoutComposer` (`CORE_LAYOUT_IDS.SINGLE_COLUMN`, `TWO_COLUMN_SEVEN_FIVE`) where every route `page.tsx` and section component is strictly decoupled (`< 170` lines per file).

---

## Mandatory Coding & Lint Invariants

1. **ESLint (`@medusajs/eslint-plugin` strict)**:
   - Run `pnpm lint` (`eslint "src/**/*.{ts,tsx}" --max-warnings=0`).
   - All public service methods must be `async` and throw `MedusaError`.
   - All `createStep` and `createWorkflow` calls must have explicit kebab-case string IDs.
   - All API Zod schemas must be exported through `src/api/validators.ts` and bound in `src/api/middlewares.ts`.
   - `src/admin/**` must never import `@medusajs/framework/utils`.
2. **Admin Modularity**:
   - Keep all Admin route `page.tsx` files, section components, and hooks under `170` lines per file.
