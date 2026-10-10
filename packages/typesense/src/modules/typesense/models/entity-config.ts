import { model } from "@medusajs/framework/utils"

export const TypesenseEntityConfig = model
  .define("mpt_entity_config", {
    id: model.id().primaryKey(),
    entity: model.text().searchable(),
    is_custom: model.boolean().default(false),
    enabled: model.boolean().default(true),
    graph_entity: model.text().nullable(),
    graph_fields: model.json().nullable(),
    query_by: model.json().nullable(),
    query_by_weights: model.json().nullable(),
    facet_by: model.json().nullable(),
    default_sort_by: model.text().nullable(),
    enable_nested_fields: model.boolean().default(true),
    embedder_config: model.json().nullable(),
    locales: model.json().nullable(),
    stopwords_set_id: model.text().nullable(),
    events_config: model.json().nullable(),
    schema_fields: model.json().nullable(),
    storefront_filter_constraint: model.text().nullable(),
    settings: model.json().nullable(),
  })
  .indexes([
    {
      on: ["entity"],
      unique: true,
      name: "UQ_mpt_entity_config_entity",
    },
  ])

export default TypesenseEntityConfig
