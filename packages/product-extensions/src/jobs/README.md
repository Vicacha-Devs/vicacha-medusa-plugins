# Scheduled Jobs

Directory reserved for Medusa scheduled background jobs (`src/jobs/*.ts`) in `@vicacha-devs/medusa-plugin-product-extensions`.

```
jobs/
└── README.md
```

---

## Overview

`@vicacha-devs/medusa-plugin-product-extensions` performs all product extension, variant media, attribute normalization, and template updates synchronously via compensated Medusa workflows (`src/workflows/index.ts`) and event subscribers (`src/subscribers/product-created.ts`, `src/subscribers/product-deleted.ts`), so no background cron jobs are registered by default.

## Adding a Scheduled Job

To add a scheduled job in the future, create a file in `src/jobs/<job-name>.ts` exporting a default handler function and a `config` object:

```ts
import type { MedusaContainer } from "@medusajs/framework/types"
import { PRODUCT_EXT_MODULE, type ProductExtModuleService } from "../modules/product-ext"

export default async function reconcileProductExtensionsJob(
  container: MedusaContainer
) {
  const service = container.resolve<ProductExtModuleService>(PRODUCT_EXT_MODULE)
  await service.listAttributes()
}

export const config = {
  name: "product-ext-reconcile",
  schedule: "0 0 * * *",
}
```
