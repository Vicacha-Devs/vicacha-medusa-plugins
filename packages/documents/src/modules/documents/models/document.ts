import { model } from "@medusajs/framework/utils"
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from "../types"

export const Document = model
  .define("mpd_document", {
    id: model.id().primaryKey(),
    document_number: model.text().searchable(),
    document_type: model.enum([...DOCUMENT_TYPES]).default("invoice"),
    status: model.enum([...DOCUMENT_STATUSES]).default("draft"),
    version: model.number().default(1),
    is_stale: model.boolean().default(false),
    stale_reason: model.text().nullable(),
    order_id: model.text(),
    fulfillment_id: model.text().nullable(),
    refund_id: model.text().nullable(),
    related_document_id: model.text().nullable(),
    template_id: model.text().nullable(),
    locale: model.text().default("en"),
    file_id: model.text().nullable(),
    file_url: model.text().nullable(),
    file_size: model.number().nullable(),
    settings_snapshot: model.json().nullable(),
    render_context_snapshot: model.json().nullable(),
    prior_versions: model.json().nullable(),
    audit_log: model.json().nullable(),
    error_message: model.text().nullable(),
    generated_at: model.dateTime().nullable(),
    emailed_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["order_id"],
      name: "IDX_mpd_document_order_id",
    },
    {
      on: ["document_type", "document_number", "version"],
      unique: true,
      name: "UQ_mpd_document_type_number_version",
    },
    {
      on: ["related_document_id"],
      name: "IDX_mpd_document_related_id",
    },
    {
      on: ["fulfillment_id"],
      name: "IDX_mpd_document_fulfillment_id",
    },
    {
      on: ["refund_id"],
      name: "IDX_mpd_document_refund_id",
    },
  ])

export default Document
