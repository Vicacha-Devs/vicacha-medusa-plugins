# API Routes

File-based REST routes under two namespaces, following Medusa's `src/api/<surface>/<path>/route.ts` convention.

```
api/
├── middlewares.ts          global middleware registration
├── middlewares/
│   └── ensure-role.ts      role guard middleware
├── admin/
│   └── b2b/
│       ├── companies/      CRUD + employees + approval-settings + customer-group
│       ├── quotes/         list, detail, send, reject, messages
│       └── approvals/      list, approve/reject
└── store/
    └── b2b/
        ├── companies/      CRUD + employees + approval-settings
        ├── quotes/         list, create (RFQ), detail, preview, accept, reject, messages
        ├── carts/
        │   └── [id]/
        │       ├── approvals/      submit cart for approval
        │       └── line-items/
        │           └── bulk/       add multiple line items in one call
        ├── approvals/      list and update (company admin view)
        └── free-shipping/
            └── prices/     threshold prices for storefront display
```

---

## Authentication

All admin routes apply `authenticate("user", ["bearer", "session", "api-key"])`.

All store routes apply `authenticate("customer", ["session", "bearer"])`.

Routes that require the `company_admin` role apply the `ensureRole("company_admin")` middleware defined in `middlewares/ensure-role.ts`.

### `ensureRole`

Resolves the authenticated customer's `provider_identity.user_metadata.role` via `remoteQuery` and returns `403 Forbidden` if it does not match the required role. Currently only `"company_admin"` is used.

---

## Route file conventions

- Each route file exports one or more named HTTP verb functions: `GET`, `POST`, `DELETE`.
- Route handlers resolve the relevant workflow or module service from `req.scope` and delegate immediately — no business logic lives in route files.
- Pagination follows Medusa's standard `limit` / `offset` query params.
- Full-text search uses the `q` param; field-specific filters use their field name directly.

---

## Adding a route

1. Create the directory path under `src/api/<surface>/b2b/<resource>/`.
2. Create `route.ts` and export the relevant HTTP methods.
3. Register any middleware in `src/api/middlewares.ts` using `defineMiddlewares`.
4. Add corresponding types to `src/types/<domain>/http.ts`.
