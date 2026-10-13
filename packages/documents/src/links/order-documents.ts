import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import DocumentsModule from "../modules/documents"

export default defineLink(OrderModule.linkable.order, {
  linkable: DocumentsModule.linkable.mpdDocument,
  isList: true,
})
