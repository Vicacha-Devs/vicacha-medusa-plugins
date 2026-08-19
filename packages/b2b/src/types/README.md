# Types

Shared TypeScript types for the plugin's public surface — HTTP request/response shapes, module-level data types, query result types, and service interfaces.

```
types/
├── index.ts              re-exports everything from all domain folders
├── company/
│   ├── http.ts           Admin* and Store* request/response types
│   ├── module.ts         ModuleCompany, ModuleEmployee, enums, ICompanyModuleService
│   ├── query.ts          QueryCompany, QueryEmployee (remoteQuery result shapes)
│   └── service.ts        service-level create/update/delete input types
├── quote/
│   ├── http.ts           AdminQuoteResponse, StoreQuoteResponse, …
│   ├── module.ts         ModuleQuote, ModuleQuoteMessage, IQuoteModuleService
│   ├── query.ts          QueryQuote
│   └── service.ts        CreateQuoteType, QuoteFilterParams
├── approval/
│   ├── http.ts           AdminUpdateApproval, StoreGetApprovalsType, …
│   ├── module.ts         ModuleApproval, ApprovalType, ApprovalStatusType, IApprovalModuleService
│   └── query.ts          QueryApproval
└── shipping-options/
    └── index.ts          StoreFreeShippingPrice
```

---

## File conventions

| File | Contains |
| --- | --- |
| `http.ts` | Types consumed by API route handlers and the admin hooks — prefixed `Admin*` or `Store*` |
| `module.ts` | Data-model types mirroring entity fields, enums, and service interfaces — prefixed `Module*` or `I*` |
| `query.ts` | Expanded types returned by `remoteQuery` — prefixed `Query*` |
| `service.ts` | Input types for workflow steps when they differ from the HTTP types |

## Usage

Import from the barrel export in `src/types` (or via the `@/types` alias):

```ts
import type { ICompanyModuleService, ModuleCompany } from "@/types"
import type { AdminCreateCompany } from "@/types"
```

Do not import from individual sub-files outside of `src/types/` — the barrel is the stable surface.

## Adding types for a new domain

1. Create a folder under `src/types/<domain>/`.
2. Add `http.ts`, `module.ts`, `query.ts`, and `service.ts` as needed.
3. Re-export from `src/types/index.ts`.
