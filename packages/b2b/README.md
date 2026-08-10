# Medusa B2B Plugin

A reusable B2B commerce plugin for Medusa v2, extracted from the official Medusa B2B Starter.

## Features

- Companies and employees
- Company/customer-group relationships
- Employee spending limits
- B2B cart validation and approval workflows
- Quote requests and negotiation
- Merchant/customer quote acceptance and rejection
- Approval settings and approval requests
- B2B-specific Admin pages for companies, quotes, and approvals
- Module links to Medusa commerce modules

## Installation

```bash
pnpm add medusa-plugin-b2b
```

Register it in `medusa-config.ts`:

```ts
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  // ...
  plugins: [
    {
      resolve: "medusa-plugin-b2b",
      options: {},
    },
  ],
})
```

The plugin provides its own modules, API routes, workflows, links, and Admin customizations. The Next.js storefront from the B2B Starter is intentionally not included; the plugin can be consumed by any storefront or application.

## API namespace

B2B APIs are namespaced to avoid collisions with application routes:

- `/admin/b2b/*`
- `/store/b2b/*`

The plugin also extends the core `/store/carts/*` flow with B2B validation middleware where required.

## Development

Build the plugin:

```bash
pnpm build
```

Publish to Medusa's local package registry:

```bash
pnpm publish:local
```

Watch and publish changes during development:

```bash
pnpm develop
```

## Version compatibility

This package is prepared for Medusa `2.18.x`. Keep the Medusa peer dependencies aligned with the Medusa version used by the host application.

## Source

Based on Medusa's B2B Starter. The storefront and starter-specific application configuration are not part of this package.
