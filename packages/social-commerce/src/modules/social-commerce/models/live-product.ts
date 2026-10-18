import { model } from "@medusajs/framework/utils"

export const LiveProduct = model
  .define("live_product", {
    id: model.id().primaryKey(),
    live_session_id: model.text(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    live_price: model.number().nullable(),
    currency_code: model.text().nullable(),
    live_stock: model.number().nullable(),
    allocated_stock: model.number().default(0),
    reserved_quantity: model.number().default(0),
    reserved_stock: model.number().default(0),
    sold_quantity: model.number().default(0),
    sold_stock: model.number().default(0),
    is_featured: model.boolean().default(false),
    pinned_at: model.dateTime().nullable(),
    sort_order: model.number().default(0),
    display_order: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["live_session_id", "product_id"],
      name: "IDX_live_product_session_product",
    },
  ])
