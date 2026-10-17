# Providers & Protocol Adapters

`medusa-plugin-odoo` provides dual-protocol Odoo ERP communication and backward-compatible module resolution without requiring any external SaaS connector proxy.

```sh
src/
├── modules/
│   ├── odoo/
│   │   ├── index.ts                     Primary module provider (Module("odoo", { service: OdooModuleService }))
│   │   └── client/
│   │       └── odoo-client.ts           Dual-protocol RPC provider (JSON-RPC 2.0 for Odoo 14–18 & JSON-2 for Odoo 19+)
│   └── odoo-sync/
│       └── index.ts                     Compatibility module provider alias for @bambiste/medusa-odoo
└── providers/
    └── README.md                        Protocol provider & compatibility alias documentation
```

---

## 1. Dual-Protocol ERP Communication (`OdooClient`)

Implemented in `src/modules/odoo/client/odoo-client.ts`, `OdooClient` abstracts the wire protocol differences between Odoo 14–18 and Odoo 19+ behind a unified TypeScript interface:

| Protocol Setting | Target Odoo Versions | Wire Endpoint & Format | Authentication Mechanism |
| :--- | :--- | :--- | :--- |
| `protocol: "jsonrpc"` *(default)* | **Odoo 14, 15, 16, 17, 18** | `POST {url}/jsonrpc`<br>JSON-RPC 2.0 envelope (`jsonrpc: "2.0"`, `method: "call"`, `params: { service, method, args }`) | 1. Calls `service: "common"`, `method: "authenticate"` with `[db, username, apiKey \|\| password, {}]` to obtain numeric `uid`.<br>2. Calls `service: "object"`, `method: "execute_kw"` with `[db, uid, apiKey \|\| password, model, method, args, kwargs]`. |
| `protocol: "json2"` | **Odoo 19+** | `POST {url}/json/2/{model}/{method}`<br>Direct JSON body (`{ args, kwargs, context }`) | Stateless HTTP headers:<br>`Authorization: Bearer <apiKey \|\| password>`<br>`X-Odoo-Database: <db>` |

### Switching Protocols

You can switch between `jsonrpc` and `json2` either in `medusa-config.ts` or dynamically at runtime via the Admin UI (`/app/odoo/connection` → `Protocol` selector) or `POST /admin/odoo/config`:

```ts
import { OdooClient } from "@vicacha-devs/medusa-plugin-odoo"

const client = new OdooClient({
  url: "https://erp.example.com",
  db: "odoo_prod",
  username: "admin@example.com",
  apiKey: process.env.ODOO_API_KEY,
  protocol: "json2", // or "jsonrpc"
  companyId: 1,
  rateLimitPerSec: 20,
  circuitThreshold: 5,
  circuitResetMs: 60000,
})

const verification = await client.verifyConnection()
```

---

## 2. Built-In Resilience & Security Guards

Every `OdooClient` instance enforces:
1. **SSRF Validation (`validateSafeOdooUrl`)**: Rejects non-HTTP(S) schemes, embedded URL credentials, cloud metadata IPs (`169.254.169.254`, `metadata.google.internal`), and private/loopback network addresses unless `allowPrivateNetwork: true` is set.
2. **Token-Bucket Rate Limiting (`rateLimitPerSec`)**: Throttles outbound RPC calls per 1-second window to protect Odoo worker pools.
3. **3-State Circuit Breaker (`closed` / `open` / `half-open`)**: Trips open after `circuitThreshold` consecutive failures and automatically probes recovery after `circuitResetMs`.
4. **Exponential Backoff Retries (`maxRetries`)**: Automatically retries transient network errors, HTTP `429`, and `5xx` responses.

---

## 3. Compatibility Module Alias (`modules/odoo-sync`)

For teams migrating from `@bambiste/medusa-odoo`, `src/modules/odoo-sync/index.ts` exports the exact same `OdooModuleService` and module definition so existing `medusa-config.ts` files referencing `medusa-plugin-odoo/modules/odoo-sync` continue to work seamlessly:

```ts
// Both module paths resolve to OdooModuleService:
modules: [
  {
    resolve: "@vicacha-devs/medusa-plugin-odoo/modules/odoo",
    // or:
    // resolve: "@vicacha-devs/medusa-plugin-odoo/modules/odoo-sync",
    options: {
      url: process.env.ODOO_URL,
      db: process.env.ODOO_DB,
      username: process.env.ODOO_USERNAME,
      apiKey: process.env.ODOO_API_KEY,
    },
  },
]
```
