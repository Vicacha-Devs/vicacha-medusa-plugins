# `@vicacha-devs/medusa-plugin-b2b`

B2B commerce capabilities for Medusa v2: companies, employees, spending limits, quote negotiation, multi-level cart approvals, and a full admin UI — all as a self-contained, droppable plugin.

> **Medusa compatibility:** `2.18.x` — keep peer dependencies aligned with your host application.

---

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Path Aliases](#path-aliases)
- [Architecture](#architecture)
- [Modules](#modules)
- [Entity Links](#entity-links)
- [Workflows](#workflows)
- [REST API](#rest-api)
- [Admin UI](#admin-ui)
- [Development](#development)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

- **Company management** — companies with name, contact info, address, logo, and currency
- **Employee roster** — link customers to companies with per-employee spending limits
- **Customer-group sync** — each company is backed by a Medusa CustomerGroup for price-list targeting
- **Spending limits** — configurable per-employee caps with reset windows (daily → yearly)
- **Cart approval flow** — require admin or sales-manager approval before a cart can be completed
- **Quote negotiation** — request-for-quote lifecycle with draft-order editing, messaging, and acceptance
- **Workflow hooks** — cart and order creation hooks that attach B2B context automatically
- **Admin UI** — overview dashboard, companies list + detail, quote list + detail + management, approval queue
- **Dual API surface** — `/admin/b2b/*` (Medusa admin JWT) and `/store/b2b/*` (customer session/bearer)
- **Role enforcement** — `company_admin` middleware guards company-mutating store routes
- **Free-shipping price API** — expose threshold prices to storefronts without custom logic

---

## Requirements

| Dependency | Version |
|---|---|
| `@medusajs/medusa` | `2.18.x` |
| Node | `≥ 20` |
| pnpm | `11.x` (or npm/yarn — adjust scripts accordingly) |

---

## Installation

```bash
pnpm add @vicacha-devs/medusa-plugin-b2b
```

Register the plugin in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  plugins: [
    {
      resolve: "@vicacha-devs/medusa-plugin-b2b",
      options: {},
    },
  ],
})
```

Run migrations after adding the plugin:

```bash
medusa db:migrate
```

### Seeding demo data

A seed script is included to create default customer groups, a B2B sales channel, and a base region with shipping options:

```bash
medusa exec ./src/scripts/seed-b2b-data.ts
```

---

## Path Aliases

The plugin ships with `@/*` path aliases for both backend and admin code.

| Context | Alias | Resolves to |
|---|---|---|
| Backend (server) | `@/*` | `src/*` |
| Admin (React) | `@/*` | `src/admin/*` |

**TypeScript** — aliases are configured in both `tsconfig.json` (backend) and `src/admin/tsconfig.json` (admin) and take effect immediately for type-checking.

**Build** — the `build` script runs `tsc-alias` after `medusa plugin:build` to rewrite alias paths in the compiled `.js` output:

```bash
pnpm build          # medusa plugin:build → tsc-alias rewrite
pnpm resolve:aliases  # run the alias rewrite step in isolation
```

**Admin Vite** — to resolve `@/*` aliases in the admin bundle, add the following to the host application's `medusa-config.ts`:

```ts
import path from "path"

export default defineConfig({
  admin: {
    vite: () => ({
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "node_modules/@vicacha-devs/medusa-plugin-b2b/src/admin"),
        },
      },
    }),
  },
})
```

---

## Architecture

The plugin registers three custom modules and a set of entity links that tie them to Medusa's core data model.

```
Medusa Core
  Cart  ──────────── (link) ─────────────── b2b_approval
  Order ──────────── (link) ──┐              ├─ Approval (N per cart, type: admin | sales_manager)
  Customer ──────── (link) ───┤              ├─ ApprovalSettings (1 per company)
  CustomerGroup ──── (link) ──┘              └─ ApprovalStatus (1 per cart)
        │
        │                 b2b_company
        └──────────────── Company
                            ├─ Employee (N)
                            │   └─ (link) ── Customer
                            └─ (link) ── CustomerGroup
                            └─ (link) ── Cart[]
                            └─ (link) ── Order[]
                            └─ (link) ── ApprovalSettings

                          b2b_quote
                            Quote
                            ├─ Message[]
                            └─ (virtual links)
                                ├─ draft Order
                                ├─ Cart
                                ├─ OrderChange
                                └─ Customer
```

### Quote lifecycle

```
Customer  →  POST /store/b2b/quotes               →  createRequestForQuoteWorkflow
                                                      ├─ Snapshot cart → draft Order + OrderChange
                                                      └─ Create Quote (status: pending_merchant)

Merchant  →  (edit items/pricing via Order Edit)
          →  POST /admin/b2b/quotes/:id/send       →  status: pending_customer

Customer  →  GET /store/b2b/quotes/:id/preview     →  previewOrderChange (live cost breakdown)
          →  POST /store/b2b/quotes/:id/accept      →  customerAcceptQuoteWorkflow
                                                         ├─ confirmOrderEditRequestWorkflow
                                                         └─ draft Order → PENDING (live)
          →  POST /store/b2b/quotes/:id/reject      →  status: customer_rejected
```

### Approval lifecycle

```
Company admin enables requires_admin_approval on ApprovalSettings

Employee  →  POST /store/b2b/carts/:id/approvals    →  createApprovalsWorkflow
                                                         ├─ Approval + ApprovalStatus records
                                                         └─ Links to Cart

            Cart is now locked:
              addToCartWorkflow.hooks.validate       →  blocks if approval pending
              completeCartWorkflow.hooks.validate    →  blocks if pending OR spending limit exceeded

Admin     →  POST /admin/b2b/approvals/:id          →  updateApprovalsWorkflow
          →  Cart unlocked, employee can complete checkout
```

---

## Modules

### `b2b_company`

Manages companies and their employees.

**`Company`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `comp_` prefix |
| `name` | string | |
| `email` | string | |
| `phone` | string | nullable |
| `address` | string | nullable |
| `city` | string | nullable |
| `state` | string | nullable |
| `zip` | string | nullable |
| `country` | string | nullable |
| `logo_url` | string | nullable |
| `currency_code` | string | nullable |
| `spending_limit_reset_frequency` | enum | `never \| daily \| weekly \| monthly \| yearly` (default: `monthly`) |

**`Employee`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `emp_` prefix |
| `spending_limit` | BigNumber | `0` = unlimited |
| `is_admin` | boolean | grants `company_admin` role |
| `company_id` | FK → Company | |

**Service:** `ICompanyModuleService` — full CRUD via MedusaService: `createCompanies`, `updateCompanies`, `deleteCompanies`, `listCompanies`, `retrieveCompany`, `createEmployees`, `updateEmployees`, `deleteEmployees`, `listEmployees`, `retrieveEmployee`.

---

### `b2b_quote`

Manages request-for-quote threads between customers and merchants.

**`Quote`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `quo_` prefix |
| `status` | enum | `pending_merchant \| pending_customer \| accepted \| customer_rejected \| merchant_rejected` |
| `customer_id` | string | |
| `draft_order_id` | string | Medusa draft Order |
| `order_change_id` | string | active OrderChange |
| `cart_id` | string | originating Cart |

**`Message`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `mess_` prefix |
| `text` | string | |
| `item_id` | string | nullable — optional line-item reference |
| `admin_id` | string | nullable — set when sent by admin |
| `customer_id` | string | nullable — set when sent by customer |

**Service:** `IQuoteModuleService` — full CRUD for `Quote` and `Message`.

---

### `b2b_approval`

Manages cart approval gates and company-level approval configuration.

**`ApprovalSettings`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `apprset_` prefix |
| `company_id` | string | |
| `requires_admin_approval` | boolean | default: `false` |
| `requires_sales_manager_approval` | boolean | default: `false` |

**`Approval`**

| Field | Type | Notes |
|---|---|---|
| `id` | string | `appr_` prefix |
| `cart_id` | string | |
| `type` | enum | `admin \| sales_manager` |
| `status` | enum | `pending \| approved \| rejected` |
| `created_by` | string | customer who submitted |
| `handled_by` | string | nullable — admin or manager who acted |

**`ApprovalStatus`**

Aggregate status for a cart — denormalized for fast lookup by cart hooks.

| Field | Type | Notes |
|---|---|---|
| `id` | string | `apprstat_` prefix |
| `cart_id` | string | |
| `status` | enum | `pending \| approved \| rejected` |

**Service:** `IApprovalModuleService` — full CRUD + `hasPendingApprovals(cartId): Promise<boolean>`.

---

## Entity Links

| Link | Left | Right | Cardinality |
|---|---|---|---|
| `employee-customer` | `Employee` (b2b_company) | `Customer` (core) | 1 : 1 |
| `company-customer-group` | `Company` (b2b_company) | `CustomerGroup` (core) | 1 : 1 |
| `company-carts` | `Company` (b2b_company) | `Cart` (core) | 1 : N |
| `order-company` | `Order` (core) | `Company` (b2b_company) | 1 : 1 |
| `company-approval-setting` | `Company` (b2b_company) | `ApprovalSettings` (b2b_approval) | 1 : 1 |
| `cart-approvals` | `Cart` (core) | `Approval` (b2b_approval) | 1 : N |
| `cart-approval-status` | `Cart` (core) | `ApprovalStatus` (b2b_approval) | 1 : 1 |

Quote → Order, Cart, OrderChange, Customer, and User relationships are registered as read-only virtual links via `MedusaModule.setCustomLink`.

---

## Workflows

### Company

| ID | Description |
|---|---|
| `create-companies` | Creates a company and its linked `ApprovalSettings` in a single atomic operation |
| `update-companies` | Updates company fields |
| `delete-companies` | Deletes company and its associated `ApprovalSettings` |
| `add-company-to-customer-group` | Adds all current employees to the company's linked `CustomerGroup` |
| `remove-company-from-customer-group` | Removes all employees from the linked `CustomerGroup` |

### Employee

| ID | Description |
|---|---|
| `create-employees` | Creates an employee record, links it to a Customer, optionally sets `company_admin` role, and adds the customer to the company's `CustomerGroup` |
| `update-employees` | Updates `spending_limit` or `is_admin` |
| `delete-employees` | Removes the employee record |

### Quote

| ID | Description |
|---|---|
| `create-request-for-quote` | Snapshots the cart into a draft Order + OrderChange, then creates the Quote in `pending_merchant` status |
| `merchant-send-quote` | Advances quote to `pending_customer` |
| `merchant-reject-quote` | Sets quote status to `merchant_rejected` |
| `customer-accept-quote` | Confirms the OrderChange, converts the draft Order to a live `PENDING` order, sets status `accepted` |
| `customer-reject-quote` | Sets status to `customer_rejected` |
| `update-quote` | Generic quote status update |
| `create-quote-message` | Appends a `Message` to the quote thread |

### Approval

| ID | Description |
|---|---|
| `create-approvals` | Creates `Approval` and `ApprovalStatus` records and links both to the cart |
| `update-approvals` | Updates approval status and syncs the cart's `ApprovalStatus` |
| `create-approval-settings` | Creates `ApprovalSettings` for a company |
| `update-approval-settings` | Toggles `requires_admin_approval` or `requires_sales_manager_approval` |

### Workflow hooks (injected into Medusa core)

| Hook point | Behavior |
|---|---|
| `createCartWorkflow.hooks.cartCreated` | If `metadata.company_id` is set on the cart, creates a Company → Cart link |
| `createOrderWorkflow.hooks.orderCreated` | If `metadata.company_id` is set, creates an Order → Company link |
| `addToCartWorkflow.hooks.validate` | Blocks item add when the cart has a pending approval |
| `updateCartWorkflow.hooks.validate` | Blocks cart update when a pending approval exists |
| `completeCartWorkflow.hooks.validate` | Blocks checkout if a pending approval exists or if the employee's spending limit would be exceeded |

---

## REST API

### Authentication

| Surface | Mechanism |
|---|---|
| Admin routes (`/admin/b2b/*`) | Medusa admin JWT (`authenticate("user", ["bearer", "session", "api-key"])`) |
| Store routes (`/store/b2b/*`) | Customer bearer token or session (`authenticate("customer", ["session", "bearer"])`) |
| Role-guarded store routes | `ensureRole("company_admin")` middleware — resolves role from `provider_identity.user_metadata.role` |

---

### Admin endpoints

#### Companies

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/b2b/companies` | List companies. Query: `q` (searches name, email, phone, city), `limit`, `offset` |
| `POST` | `/admin/b2b/companies` | Create one or many companies |
| `GET` | `/admin/b2b/companies/:id` | Retrieve company |
| `POST` | `/admin/b2b/companies/:id` | Update company |
| `DELETE` | `/admin/b2b/companies/:id` | Delete company |
| `GET` | `/admin/b2b/companies/:id/employees` | List employees of a company |
| `POST` | `/admin/b2b/companies/:id/employees` | Create employee |
| `GET` | `/admin/b2b/companies/:id/employees/:employeeId` | Retrieve employee |
| `POST` | `/admin/b2b/companies/:id/employees/:employeeId` | Update employee |
| `DELETE` | `/admin/b2b/companies/:id/employees/:employeeId` | Delete employee |
| `POST` | `/admin/b2b/companies/:id/approval-settings` | Update approval settings |
| `GET` | `/admin/b2b/companies/:id/customer-group` | Get linked customer group |
| `POST` | `/admin/b2b/companies/:id/customer-group` | Link company to a customer group |
| `DELETE` | `/admin/b2b/companies/:id/customer-group/:customerGroupId` | Unlink customer group |

#### Quotes

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/b2b/quotes` | List quotes. Query: `q` (customer name/email), `status`, `limit`, `offset` |
| `GET` | `/admin/b2b/quotes/:id` | Retrieve quote with messages and order preview |
| `POST` | `/admin/b2b/quotes/:id/send` | Send quote to customer (→ `pending_customer`) |
| `POST` | `/admin/b2b/quotes/:id/reject` | Reject quote (→ `merchant_rejected`) |
| `POST` | `/admin/b2b/quotes/:id/messages` | Append a message to the quote thread |

#### Approvals

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin/b2b/approvals` | List carts pending approval. Query: `q` (company name), `status` |
| `POST` | `/admin/b2b/approvals/:id` | Approve or reject. Body: `{ status: "approved" \| "rejected" }` |

---

### Store endpoints

#### Companies

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/store/b2b/companies` | customer | Create company |
| `GET` | `/store/b2b/companies/:id` | customer | Retrieve company |
| `POST` | `/store/b2b/companies/:id` | customer | Update company |
| `DELETE` | `/store/b2b/companies/:id` | customer | Delete company |
| `GET` | `/store/b2b/companies/:id/employees` | customer | List employees |
| `POST` | `/store/b2b/companies/:id/employees` | company_admin | Create employee |
| `GET` | `/store/b2b/companies/:id/employees/:employeeId` | customer | Retrieve employee |
| `POST` | `/store/b2b/companies/:id/employees/:employeeId` | company_admin | Update employee |
| `POST` | `/store/b2b/companies/:id/approval-settings` | company_admin | Toggle approval requirements |

#### Quotes

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/store/b2b/quotes` | customer | List quotes for the authenticated customer |
| `POST` | `/store/b2b/quotes` | customer | Create a Request for Quote from the current cart |
| `GET` | `/store/b2b/quotes/:id` | customer | Retrieve quote |
| `GET` | `/store/b2b/quotes/:id/preview` | customer | Live order-change preview (pricing, items, totals) |
| `POST` | `/store/b2b/quotes/:id/accept` | customer | Accept quote |
| `POST` | `/store/b2b/quotes/:id/reject` | customer | Reject quote |
| `POST` | `/store/b2b/quotes/:id/messages` | customer | Append message |

#### Carts & approvals

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/store/b2b/carts/:id/approvals` | customer | Submit cart for approval |
| `POST` | `/store/b2b/carts/:id/line-items/bulk` | customer | Add multiple line items in one request |
| `GET` | `/store/b2b/approvals` | customer | List approvals for the customer's company (company_admin view) |
| `POST` | `/store/b2b/approvals/:id` | customer | Update approval status (company_admin) |

#### Pricing

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/store/b2b/free-shipping/prices` | none | Returns price rules with `amount=0` and `item_total` conditions — used by storefronts to compute free-shipping thresholds |

---

## Admin UI

The plugin registers the following pages in the Medusa admin shell under the `/b2b` route group.

| Route | Page | Description |
|---|---|---|
| `/b2b` | Overview | Dashboard with stat cards: total companies, employees, pending quotes, pending approvals |
| `/b2b/companies` | Companies | Searchable, paginated company table with inline create drawer |
| `/b2b/companies/:id` | Company detail | Employee roster, approval settings toggle, customer-group assignment |
| `/b2b/quotes` | Quotes | Filterable quote list (status, customer) |
| `/b2b/quotes/:id` | Quote detail | Order preview, line items, cost breakdown, message thread, send / reject actions |
| `/b2b/quotes/:id/manage` | Quote management | Edit items and pricing within the draft order change |
| `/b2b/approvals` | Approval queue | Carts pending approval with approve / reject actions |

### Component library

The plugin includes a shared component library under `src/admin/components/common/`:

- **`DataTable`** — `@tanstack/react-table` wrapper with column sorting, pagination, and pluggable filter components (`StringFilter`, `SelectFilter`, `NumberFilter`)
- **`Form`** — `react-hook-form` `FormProvider` + `Controller` wrapper
- **`RouteFocusModal` / `StackedFocusModal`** — route-based focus modals for create and edit flows
- **`ActionMenu`** — kebab action dropdown
- **`DeletePrompt`** — confirmation dialog for destructive actions
- **`JsonViewSection`** — raw JSON section using `@uiw/react-json-view`
- **Table cells** — `AmountCell` (formatted currency), `ProductCell` (image + title)

### React Query hooks

All data-fetching is handled via React Query hooks in `src/admin/hooks/api/`:
`useCompanies`, `useCompany`, `useCreateCompany`, `useUpdateCompany`, `useDeleteCompany`, `useEmployees`, `useEmployee`, `useCreateEmployee`, `useUpdateEmployee`, `useDeleteEmployee`, `useQuotes`, `useQuote`, `useSendQuote`, `useRejectQuote`, `useCreateQuoteMessage`, `useApprovals`, `useUpdateApproval`, `useOrderPreview`.

---

## Development

```bash
# Build (compiles TypeScript + resolves path aliases)
pnpm build

# Develop in watch mode (publishes to local Medusa package registry on each change)
pnpm dev

# Publish to local registry
pnpm publish:local

# Type-check only
pnpm exec tsc --noEmit

# Lint
pnpm lint
```

### Project layout

```
src/
├── admin/          # React admin extension (Vite / react-jsx)
│   ├── components/ # Shared UI components
│   ├── hooks/      # React Query hooks
│   ├── i18n/       # i18next setup
│   ├── lib/        # SDK client, query-key factory
│   ├── routes/     # Admin page routes
│   └── utils/      # Admin utilities
├── api/            # REST route handlers
│   ├── admin/      # /admin/b2b/* endpoints
│   ├── middlewares/ # ensureRole, auth guards
│   └── store/      # /store/b2b/* endpoints
├── links/          # Remote entity link definitions
├── modules/        # Custom Medusa modules (company, quote, approval)
├── scripts/        # Seed scripts
├── types/          # Shared TypeScript types (HTTP, module, query, service)
├── utils/          # Spending limit, cart approval status helpers
└── workflows/      # Medusa workflows and core workflow hooks
```

---

## Roadmap

- [ ] Validate Edit and Create companies.
- [ ] Bug: creating companies does not create companies.
- [ ] Fix: check all typing issues and solve them.
- [ ] Implement UI [DataTable](https://docs.medusajs.com/ui/components/data-table) and useDataTable. Note: maybe not since the ConfigurableDataTable could be the new standard.
- [x] **Internationalization (i18n)** — full translation coverage for `en`, `es`, `tr`, and `ar`, including RTL layout support for Arabic.

- **B2B / B2C product and price segmentation** — control product visibility and assign prices per audience (B2B only, B2C only, or both), with support for audience-specific price lists. (stashed)

- **Full admin table feature parity** — bring all table views in line with Medusa's native admin experience: view configurations (column visibility and ordering), server-side search, composable filter chains, and bulk actions. (use price-lists view as example)

---

## License

MIT — see [LICENSE](./LICENSE).
