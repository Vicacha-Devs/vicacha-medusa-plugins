import { model } from "@medusajs/framework/utils";
import { Company } from "./company";

export const Employee = model
  .define("employee", {
    id: model.id({ prefix: "emp" }).primaryKey(),
    spending_limit: model.bigNumber().default(0),
    is_admin: model.boolean().default(false),
    is_active: model.boolean().default(true),
    company: model.belongsTo(() => Company, {
      mappedBy: "employees",
    }),
  })
  .indexes([
    {
      name: "IDX_employee_company_id",
      on: ["company_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_employee_company_id_is_admin",
      on: ["company_id", "is_admin"],
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_employee_company_id_is_active",
      on: ["company_id", "is_active"],
      where: "deleted_at IS NULL",
    },
  ]);
