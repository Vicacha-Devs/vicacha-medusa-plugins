import { model } from "@medusajs/framework/utils"
import { SYNC_ACTIONS, SYNC_STATUSES } from "../types"

export const TypesenseSyncJob = model
  .define("mpt_sync_job", {
    id: model.id().primaryKey(),
    entity: model.text().searchable(),
    collection_name: model.text(),
    alias_name: model.text().nullable(),
    locale: model.text().default("en"),
    action: model.enum([...SYNC_ACTIONS]).default("full_reindex"),
    status: model.enum([...SYNC_STATUSES]).default("pending"),
    documents_processed: model.number().default(0),
    documents_failed: model.number().default(0),
    duration_ms: model.number().nullable(),
    triggered_by: model.text().default("system"),
    error_message: model.text().nullable(),
    started_at: model.dateTime().nullable(),
    completed_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["entity"],
      name: "IDX_mpt_sync_job_entity",
    },
    {
      on: ["status"],
      name: "IDX_mpt_sync_job_status",
    },
  ])

export default TypesenseSyncJob
