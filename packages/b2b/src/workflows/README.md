# Workflows

Medusa workflows that implement the B2B business logic. Each workflow is composed of atomic, compensable steps.

```
workflows/
├── company/
│   ├── steps/        createCompaniesStep, updateCompaniesStep, deleteCompaniesStep, …
│   └── workflows/    createCompaniesWorkflow, updateCompaniesWorkflow, deleteCompaniesWorkflow, …
├── employee/
│   ├── steps/        createEmployeesStep, updateEmployeesStep, deleteEmployeesStep, …
│   └── workflows/    createEmployeesWorkflow, updateEmployeesWorkflow, deleteEmployeesWorkflow
├── quote/
│   ├── steps/        createQuotesStep, updateQuotesStep, createQuoteMessageStep, …
│   └── workflows/    createRequestForQuoteWorkflow, merchantSendQuoteWorkflow, …
├── approval/
│   ├── steps/        createApprovalStep, updateApprovalStep, createApprovalSettingsStep, …
│   └── workflows/    createApprovalsWorkflow, updateApprovalsWorkflow, …
├── order/
│   ├── steps/        updateOrderStep
│   └── workflows/    updateOrderWorkflow
└── hooks/            injected into Medusa core workflows
    ├── cart-created.ts
    ├── order-created.ts
    ├── validate-add-to-cart.ts
    ├── validate-update-cart.ts
    └── validate-cart-completion.ts
```

---

## Step conventions

- Every step file exports a single named step created with `createStep`.
- The step ID (first argument) matches the file name in kebab-case.
- Steps resolve their module service via `MedusaContext` (`req.scope.resolve(MODULE_TOKEN)`).
- Steps define a `compensate` function wherever the operation is reversible.

## Workflow conventions

- Every workflow file exports a named workflow created with `createWorkflow`.
- Input/output types are defined in `src/types/<domain>/` and imported from there.
- Workflows that touch remote links always end with `createRemoteLinkStep` (or `dismissRemoteLinkStep` in compensation).

---

## Hooks

Hook files in `hooks/` are side-effecting — they inject behavior into Medusa's built-in workflows without modifying core code. They are self-registering: importing the file is enough to wire the hook.

All entry points in `src/workflows/index.ts` export the hook files so they are loaded at startup.

| File | Hooks into | Effect |
| --- | --- | --- |
| `cart-created.ts` | `createCartWorkflow.hooks.cartCreated` | Links company → cart when `metadata.company_id` is present |
| `order-created.ts` | `createOrderWorkflow.hooks.orderCreated` | Links order → company when `metadata.company_id` is present |
| `validate-add-to-cart.ts` | `addToCartWorkflow.hooks.validate` | Throws if cart has a pending approval |
| `validate-update-cart.ts` | `updateCartWorkflow.hooks.validate` | Throws if cart has a pending approval |
| `validate-cart-completion.ts` | `completeCartWorkflow.hooks.validate` | Throws if pending approval, or if cart total would exceed the employee's spending limit |

---

## Workflow index

| ID | File | Trigger |
| --- | --- | --- |
| `create-companies` | `company/workflows/create-companies.ts` | `POST /admin/b2b/companies` |
| `update-companies` | `company/workflows/update-companies.ts` | `POST /admin/b2b/companies/:id` |
| `delete-companies` | `company/workflows/delete-companies.ts` | `DELETE /admin/b2b/companies/:id` |
| `add-company-to-customer-group` | `company/workflows/add-company-to-customer-group.ts` | `POST /admin/b2b/companies/:id/customer-group` |
| `remove-company-from-customer-group` | `company/workflows/remove-company-from-customer-group.ts` | `DELETE /admin/b2b/companies/:id/customer-group/:id` |
| `create-employees` | `employee/workflows/create-employees.ts` | `POST /admin\|store/b2b/companies/:id/employees` |
| `update-employees` | `employee/workflows/update-employees.ts` | `POST /admin\|store/b2b/companies/:id/employees/:id` |
| `delete-employees` | `employee/workflows/delete-employees.ts` | `DELETE /admin/b2b/companies/:id/employees/:id` |
| `create-request-for-quote` | `quote/workflows/create-request-for-quote.ts` | `POST /store/b2b/quotes` |
| `merchant-send-quote` | `quote/workflows/merchant-send-quote.ts` | `POST /admin/b2b/quotes/:id/send` |
| `merchant-reject-quote` | `quote/workflows/merchant-reject-quote.ts` | `POST /admin/b2b/quotes/:id/reject` |
| `customer-accept-quote` | `quote/workflows/customer-accept-quote.ts` | `POST /store/b2b/quotes/:id/accept` |
| `customer-reject-quote` | `quote/workflows/customer-reject-quote.ts` | `POST /store/b2b/quotes/:id/reject` |
| `update-quote` | `quote/workflows/update-quote.ts` | internal |
| `create-quote-message` | `quote/workflows/create-quote-message.ts` | `POST /admin\|store/b2b/quotes/:id/messages` |
| `create-approvals` | `approval/workflows/create-approvals.ts` | `POST /store/b2b/carts/:id/approvals` |
| `update-approvals` | `approval/workflows/update-approvals.ts` | `POST /admin\|store/b2b/approvals/:id` |
| `create-approval-settings` | `approval/workflows/create-approval-settings.ts` | internal (called from create-companies) |
| `update-approval-settings` | `approval/workflows/update-approval-settings.ts` | `POST /admin\|store/b2b/companies/:id/approval-settings` |
