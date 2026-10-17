import { model } from "@medusajs/framework/utils"
import { DIAN_DOCUMENT_TYPES } from "../../../types"

export const DianResolution = model
  .define("dian_resolution", {
    id: model.id({ prefix: "dres" }).primaryKey(),
    resolution_number: model.text(),
    resolution_date: model.text().nullable(),
    prefix: model.text(),
    document_type: model.enum([...DIAN_DOCUMENT_TYPES]).default("01"),
    from_number: model.number(),
    to_number: model.number(),
    current_number: model.number(),
    valid_from: model.text(), // YYYY-MM-DD
    valid_to: model.text(), // YYYY-MM-DD
    technical_key: model.text().nullable(), // Clave Técnica DIAN (required for 01 Factura CUFE)
    sales_channel_id: model.text().nullable(),
    stock_location_id: model.text().nullable(),
    pos_terminal_id: model.text().nullable(),
    alert_threshold: model.number().default(100),
    is_active: model.boolean().default(true),
    is_contingency: model.boolean().default(false),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      name: "IDX_dian_res_type_prefix",
      on: ["document_type", "prefix"],
      where: "deleted_at IS NULL",
    },
  ])
