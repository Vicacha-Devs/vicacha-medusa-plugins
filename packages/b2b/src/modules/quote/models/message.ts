import { model } from "@medusajs/framework/utils";

import { Quote } from "./quote";

export const Message = model
  .define("message", {
    id: model.id({ prefix: "mess" }).primaryKey(),
    text: model.text().searchable(),
    item_id: model.text().nullable(),
    admin_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    quote: model.belongsTo(() => Quote, { mappedBy: "messages" }),
  })
  .indexes([
    {
      name: "IDX_message_quote_id_created_at",
      on: ["quote_id", "created_at"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_message_customer_id",
      on: ["customer_id"],
      where: "deleted_at IS NULL AND customer_id IS NOT NULL",
    },
    {
      name: "IDX_message_admin_id",
      on: ["admin_id"],
      where: "deleted_at IS NULL AND admin_id IS NOT NULL",
    },
    {
      name: "IDX_message_item_id",
      on: ["item_id"],
      where: "deleted_at IS NULL AND item_id IS NOT NULL",
    },
  ]);
