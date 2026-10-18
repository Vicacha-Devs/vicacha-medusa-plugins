import { Module } from "@medusajs/framework/utils"
import ProductExtModuleService, {
  ProductExtService,
  type ProductExtServiceInstance,
  type ProductExtServiceType,
} from "./service"
import { PRODUCT_EXT_MODULE, PRODUCT_EXT_MODULE_KEY } from "./types"

export const ProductExtModule = Module(PRODUCT_EXT_MODULE, {
  service: ProductExtModuleService,
})

export {
  PRODUCT_EXT_MODULE,
  PRODUCT_EXT_MODULE_KEY,
  ProductExtModuleService,
  ProductExtService,
  type ProductExtServiceType,
  type ProductExtServiceInstance,
}
export { Migration20260514000000 } from "./migrations/Migration20260514000000"
export * from "./models"
export * from "./types"
export * from "./utils/security"
export * from "./utils/unit-converter"
export * from "./utils/media-parser"
export * from "./utils/content-tree"

export default ProductExtModule
