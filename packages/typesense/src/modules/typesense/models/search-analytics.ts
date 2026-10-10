import { model } from "@medusajs/framework/utils"
import { SEARCH_MODES } from "../types"

export const TypesenseSearchAnalytics = model
  .define("mpt_search_analytics", {
    id: model.id().primaryKey(),
    entity: model.text().default("products"),
    query: model.text().searchable(),
    normalized_query: model.text().searchable(),
    mode: model.enum([...SEARCH_MODES]).default("keyword"),
    locale: model.text().default("en"),
    results_count: model.number().default(0),
    is_no_hit: model.boolean().default(false),
    latency_ms: model.number().default(0),
    clicked_document_id: model.text().nullable(),
    click_position: model.number().nullable(),
    converted: model.boolean().default(false),
    sales_channel_id: model.text().nullable(),
    filters_snapshot: model.json().nullable(),
  })
  .indexes([
    {
      on: ["entity", "normalized_query"],
      name: "IDX_mpt_search_analytics_entity_query",
    },
    {
      on: ["is_no_hit"],
      name: "IDX_mpt_search_analytics_no_hit",
    },
  ])

export default TypesenseSearchAnalytics
