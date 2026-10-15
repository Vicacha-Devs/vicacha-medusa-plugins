import { Module } from "@medusajs/framework/utils"

import { BarcodeModuleService, BarcodeService } from "./service"
import { BARCODE_MODULE } from "./types"

export { BARCODE_MODULE, BarcodeModuleService, BarcodeService }
export * from "./models"
export * from "./providers"
export * from "./types"
export * from "./utils/barcode-parser"
export * from "./utils/label-printer"
export * from "./utils/normalize-product"
export * from "./utils/security"
export * from "./utils/svg-renderer"

export default Module(BARCODE_MODULE, {
  service: BarcodeModuleService,
})
