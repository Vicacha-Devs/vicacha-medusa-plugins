import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductExtModule from "../modules/product-ext"

export default defineLink(
  ProductModule.linkable.product,
  ProductExtModule.linkable.productExtension
)
