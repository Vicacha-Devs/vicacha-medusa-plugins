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
