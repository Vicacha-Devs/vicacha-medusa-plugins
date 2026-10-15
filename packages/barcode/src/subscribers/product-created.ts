import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { bulkGenerateVariantBarcodesWorkflow } from "../workflows"
import type { BarcodeModuleService } from "../modules/barcode/service"
import { BARCODE_MODULE } from "../modules/barcode/types"

export default async function productBarcodeSubscriber({
  event,
  container,
}: SubscriberArgs<{ id?: string; variant_id?: string }>) {
  try {
    const barcodeService = container.resolve(
      BARCODE_MODULE
    ) as BarcodeModuleService
    const options = await barcodeService.getModuleOptions()
    if (options.autoGenerateVariantBarcode === false) {
      return
    }

    const variantId = event.data?.variant_id || event.data?.id
    if (!variantId) {
      return
    }

    await bulkGenerateVariantBarcodesWorkflow(container).run({
      input: {
        variant_ids: [variantId],
        prefix: options.internalBarcodePrefix || "200",
        overwrite: false,
      },
    })
  } catch {
    // Non-fatal subscriber execution
  }
}

export const config: SubscriberConfig = {
  event: ["product-variant.created", "product.created"],
}
