import { model } from "@medusajs/framework/utils";
import { ESpendingLimitResetFrequency } from "@b2b/types";
import { Employee } from "./employee";

export const Company = model
  .define("company", {
    id: model.id({ prefix: "comp" }).primaryKey(),
    name: model.text(),
    email: model.text(),
    phone: model.text().nullable(),
    address: model.text().nullable(),
    city: model.text().nullable(),
    state: model.text().nullable(),
    zip: model.text().nullable(),
    country: model.text().nullable(),
    logo_url: model.text().nullable(),
    currency_code: model.text().nullable(),
    spending_limit_reset_frequency: model
      .enum(ESpendingLimitResetFrequency)
      .default(ESpendingLimitResetFrequency.MONTHLY),
    spending_limit_reset_at: model.dateTime().nullable(),
    employees: model.hasMany(() => Employee),
  })
  .cascades({
    delete: ["employees"],
  })
  .indexes([
    {
      name: "IDX_company_email",
      on: ["email"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_company_name",
      on: ["name"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_company_currency_code",
      on: ["currency_code"],
      where: "deleted_at IS NULL AND currency_code IS NOT NULL",
    },
  ]);
