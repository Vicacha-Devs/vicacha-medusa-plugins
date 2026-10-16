# Scheduled Jobs

Background cron jobs registered by `medusa-plugin-barcode` under `src/jobs/`.

```sh
jobs/
└── purge-expired-barcode-cache.ts      purges expired barcode_cache rows every 6 hours
```

---

## `purge-expired-barcode-cache`

| Property | Value |
| --- | --- |
| **File** | `src/jobs/purge-expired-barcode-cache.ts` |
| **Job Name** | `"purge-expired-barcode-cache"` |
| **Cron Schedule** | `"0 */6 * * *"` (every 6 hours at minute 0) |
| **Service Delegate** | `barcodeService.purgeExpiredCache()` |

### Behavior

When `cacheEnabled: true` (the default), external GTIN/ISBN lookup responses from the 10-provider chain are cached in the `barcode_cache` table with an `expires_at` timestamp (`now + cacheTtlSeconds`, default `86400` seconds / 24 hours).

Every 6 hours, `purgeExpiredBarcodeCacheJob` resolves `BARCODE_MODULE` (`"barcode"`) from the `MedusaContainer` and executes `barcodeService.purgeExpiredCache()`, deleting all `BarcodeCache` rows whose `expires_at` timestamp is earlier than the current time.

```ts
import type { MedusaContainer } from "@medusajs/framework/types"
import type { BarcodeModuleService } from "../modules/barcode/service"
import { BARCODE_MODULE } from "../modules/barcode/types"

export default async function purgeExpiredBarcodeCacheJob(
  container: MedusaContainer
) {
  const barcodeService = container.resolve(
    BARCODE_MODULE
  ) as BarcodeModuleService
  await barcodeService.purgeExpiredCache()
}

export const config = {
  name: "purge-expired-barcode-cache",
  schedule: "0 */6 * * *",
}
```

---

## Manual cache purge

In addition to the scheduled job, administrators can inspect or purge cached lookups on demand via:

- **REST API**: `DELETE /admin/barcodes/cache` (purges expired rows) or `DELETE /admin/barcodes/cache?all=true` (clears all cached entries).
- **Admin UI**: `/app/barcodes/providers` ("Providers & Cache" route).
