import { model } from "@medusajs/framework/utils"
import {
  DIAN_IDENTIFICATION_TYPES,
  DIAN_ORGANIZATION_TYPES,
  DIAN_TAX_REGIMES,
} from "../../../types"

export const DianCustomerFiscalProfile = model
  .define("dian_customer_fiscal_profile", {
    id: model.id({ prefix: "dfisc" }).primaryKey(),
    customer_id: model.text(), // Required: people who want an electronic invoice must be registered clients
    company_id: model.text().nullable(), // Required when organization_type === "1" via @vicacha-devs/medusa-plugin-b2b
    identification_type: model
      .enum([...DIAN_IDENTIFICATION_TYPES])
      .default("13"),
    identification_number: model.text(),
    dv: model.text().nullable(),
    organization_type: model
      .enum([...DIAN_ORGANIZATION_TYPES])
      .default("2"),
    tax_regime: model.enum([...DIAN_TAX_REGIMES]).default("49"),
    fiscal_responsibilities: model.json().nullable(), // e.g. ["R-99-PN"] or ["O-13", "O-23"]
    tributo_id: model.text().default("ZZ"),
    registration_name: model.text(),
    trade_name: model.text().nullable(),
    first_name: model.text().nullable(),
    last_name: model.text().nullable(),
    email: model.text(), // Mandatory for DIAN Electronic Invoice delivery
    phone: model.text(), // Mandatory for DIAN Electronic Invoice contact
    address_line: model.text().default("Colombia"),
    municipality_code: model.text().default("11001"),
    municipality_name: model.text().default("Bogotá, D.C."),
    department_code: model.text().default("11"),
    department_name: model.text().default("Bogotá, D.C."),
    postal_code: model.text().default("110111"),
    country_code: model.text().default("CO"),
    is_verified_in_dian: model.boolean().default(false),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_dian_fiscal_customer_id",
      on: ["customer_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_dian_fiscal_identification",
      on: ["identification_type", "identification_number"],
      where: "deleted_at IS NULL",
    },
  ])
