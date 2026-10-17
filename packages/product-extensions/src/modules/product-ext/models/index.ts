import { model } from "@medusajs/framework/utils"

export const ProductExtension = model
  .define("product_extension", {
    id: model.id().primaryKey(),
    product_id: model.text().searchable(),
    videos: model.json().nullable(),
    tagline: model.text().nullable(),
    media_items: model.json().nullable(),
    models_3d: model.json().nullable(),
    attachments: model.json().nullable(),
    image_alts: model.json().nullable(),
    content_tree: model.json().nullable(),
    content_diff: model.json().nullable(),
    template_id: model.text().nullable(),
    feature_ids: model.json().nullable(),
    option_metadata: model.json().nullable(),
    storefront_overrides: model.json().nullable(),
    seo_metadata: model.json().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["product_id"],
      unique: true,
    },
    {
      on: ["template_id"],
      unique: false,
    },
  ])

export const VariantExtension = model
  .define("variant_extension", {
    id: model.id().primaryKey(),
    variant_id: model.text().searchable(),
    product_id: model.text().nullable(),
    thumbnail: model.text().nullable(),
    images: model.json().nullable(),
    videos: model.json().nullable(),
    media_items: model.json().nullable(),
    option_signature: model.text().nullable(),
    swatch_color: model.text().nullable(),
    swatch_image_url: model.text().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["variant_id"],
      unique: true,
    },
    {
      on: ["product_id"],
      unique: false,
    },
    {
      on: ["product_id", "option_signature"],
      unique: false,
    },
  ])

export const AttributeDefinition = model
  .define("product_ext_attribute", {
    id: model.id().primaryKey(),
    key: model.text().searchable(),
    label: model.text().searchable(),
    description: model.text().nullable(),
    type: model
      .enum([
        "text",
        "number",
        "boolean",
        "select",
        "multiselect",
        "color",
        "unit",
        "file",
        "sortable_list",
      ])
      .default("text"),
    unit_family: model.text().nullable(),
    default_unit: model.text().nullable(),
    allowed_units: model.json().nullable(),
    options: model.json().nullable(),
    validation_rules: model.json().nullable(),
    is_filterable: model.boolean().default(true),
    is_required: model.boolean().default(false),
    is_global: model.boolean().default(false),
    category_ids: model.json().nullable(),
    sort_order: model.number().default(0),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["key"],
      unique: true,
    },
    {
      on: ["is_filterable"],
      unique: false,
    },
    {
      on: ["is_global"],
      unique: false,
    },
  ])

export const AttributeTemplate = model
  .define("product_ext_attribute_template", {
    id: model.id().primaryKey(),
    code: model.text().searchable(),
    name: model.text().searchable(),
    description: model.text().nullable(),
    category_ids: model.json().nullable(),
    attribute_keys: model.json().nullable(),
    content_tree: model.json().nullable(),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["code"],
      unique: true,
    },
    {
      on: ["is_active"],
      unique: false,
    },
  ])

export const ProductAttributeValue = model
  .define("product_ext_attribute_value", {
    id: model.id().primaryKey(),
    product_id: model.text().searchable(),
    attribute_id: model.text(),
    attribute_key: model.text().searchable(),
    value_text: model.text().nullable(),
    value_number: model.number().nullable(),
    value_boolean: model.boolean().nullable(),
    value_json: model.json().nullable(),
    unit: model.text().nullable(),
    value_normalized_si: model.number().nullable(),
    sort_order: model.number().default(0),
    locale: model.text().nullable(),
  })
  .indexes([
    {
      on: ["product_id", "attribute_key"],
      unique: false,
    },
    {
      on: ["attribute_key", "value_normalized_si"],
      unique: false,
    },
    {
      on: ["attribute_key", "value_text"],
      unique: false,
    },
  ])

export const ProductFeature = model
  .define("product_ext_feature", {
    id: model.id().primaryKey(),
    code: model.text().searchable(),
    title: model.text().searchable(),
    subtitle: model.text().nullable(),
    description: model.text().nullable(),
    icon_url: model.text().nullable(),
    icon_name: model.text().nullable(),
    badge_color: model.text().nullable(),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
  })
  .indexes([
    {
      on: ["code"],
      unique: true,
    },
    {
      on: ["is_active"],
      unique: false,
    },
  ])
