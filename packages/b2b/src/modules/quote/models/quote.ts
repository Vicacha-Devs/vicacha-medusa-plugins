import { model } from "@medusajs/framework/utils";
import { EQuoteStatus } from "@b2b/types";

import { Message } from "./message";

export const Quote = model
  .define("quote", {
    id: model.id({ prefix: "quo" }).primaryKey(),
    status: model.enum(EQuoteStatus).default(EQuoteStatus.PendingMerchant),
    customer_id: model.text(),
    draft_order_id: model.text(),
    order_change_id: model.text().nullable(),
    cart_id: model.text(),
    messages: model.hasMany(() => Message, { mappedBy: "quote" }),
  })
  .cascades({
    delete: ["messages"],
  })
  .indexes([
    {
      name: "IDX_quote_customer_id",
      on: ["customer_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_quote_status",
      on: ["status"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_quote_customer_status",
      on: ["customer_id", "status"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_quote_draft_order_id",
      on: ["draft_order_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_quote_cart_id",
      on: ["cart_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ]);
