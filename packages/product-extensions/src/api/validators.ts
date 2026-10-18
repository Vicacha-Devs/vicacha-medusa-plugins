import { z } from "@medusajs/framework/zod"

export const VideoItemSchema = z.union([
  z.string().min(1).max(2048),
  z.object({
    id: z.string().max(128).optional(),
    url: z.string().min(1).max(2048),
    provider: z
      .enum([
        "file",
        "youtube",
        "vimeo",
        "mux",
        "cloudflare_stream",
        "external",
      ])
      .optional(),
    embed_id: z.string().max(128).nullable().optional(),
    embed_url: z.string().max(2048).nullable().optional(),
    poster_url: z.string().max(2048).nullable().optional(),
    captions_url: z.string().max(2048).nullable().optional(),
    mime_type: z.string().max(128).nullable().optional(),
    mimeType: z.string().max(128).nullable().optional(),
    name: z.string().max(255).nullable().optional(),
    size: z.number().nonnegative().nullable().optional(),
    title: z.string().max(255).nullable().optional(),
    alt: z.string().max(500).nullable().optional(),
    duration_seconds: z.number().nonnegative().nullable().optional(),
    position: z.number().int().nonnegative().optional(),
    autoplay: z.boolean().optional(),
    loop: z.boolean().optional(),
    muted: z.boolean().optional(),
  }),
])

export const Model3DSchema = z.object({
  id: z.string().max(128).optional(),
  glb_url: z.string().min(1).max(2048),
  usdz_url: z.string().max(2048).nullable().optional(),
  poster_url: z.string().max(2048).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  alt: z.string().max(500).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  ar_scale: z.enum(["auto", "fixed"]).optional(),
})

export const ProductAttachmentSchema = z.object({
  id: z.string().max(128).optional(),
  url: z.string().min(1).max(2048),
  filename: z.string().min(1).max(255),
  label: z.string().min(1).max(255),
  category: z
    .enum([
      "manual",
      "datasheet",
      "size_guide",
      "certificate",
      "warranty",
      "other",
    ])
    .optional(),
  mime_type: z.string().max(128).nullable().optional(),
  size_bytes: z.number().int().nonnegative().nullable().optional(),
  locale: z.string().max(32).nullable().optional(),
  position: z.number().int().nonnegative().optional(),
})

export const ImageAltMetadataSchema = z.object({
  image_id: z.string().max(128).nullable().optional(),
  image_url: z.string().min(1).max(2048),
  alt: z.string().max(500),
  title: z.string().max(255).nullable().optional(),
  caption: z.string().max(1000).nullable().optional(),
  focal_point: z
    .object({
      x: z.number().min(0).max(1),
      y: z.number().min(0).max(1),
    })
    .nullable()
    .optional(),
  locale: z.string().max(32).nullable().optional(),
})

export const OptionValueSwatchSchema = z.object({
  option_title: z.string().min(1).max(128),
  value: z.string().min(1).max(128),
  hex_color: z.string().max(16).nullable().optional(),
  secondary_hex_color: z.string().max(16).nullable().optional(),
  swatch_image_url: z.string().max(2048).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
})

export const ProductOptionMetadataSchema = z.object({
  option_title: z.string().min(1).max(128),
  display_style: z
    .enum(["buttons", "color_swatch", "image_swatch", "dropdown"])
    .optional(),
  size_chart_url: z.string().max(2048).nullable().optional(),
  tooltip: z.string().max(500).nullable().optional(),
  values: z.array(OptionValueSwatchSchema).optional(),
})

export const StorefrontOverrideSchema = z.object({
  scope_key: z.string().min(1).max(128),
  sales_channel_id: z.string().max(128).nullable().optional(),
  locale: z.string().max(32).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  subtitle: z.string().max(500).nullable().optional(),
  tagline: z.string().max(500).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  handle: z.string().max(255).nullable().optional(),
  badges: z.array(z.string().max(128)).optional(),
  videos: z.array(VideoItemSchema).optional(),
  seo_title: z.string().max(255).nullable().optional(),
  seo_description: z.string().max(1000).nullable().optional(),
})

export const ProductSeoMetadataSchema = z.object({
  meta_title: z.string().max(255).nullable().optional(),
  meta_description: z.string().max(1000).nullable().optional(),
  canonical_url: z.string().max(2048).nullable().optional(),
  og_image_url: z.string().max(2048).nullable().optional(),
  keywords: z.array(z.string().max(128)).optional(),
  noindex: z.boolean().optional(),
})

export const UpsertProductExtBodySchema = z.object({
  videos: z.array(VideoItemSchema).optional(),
  tagline: z.string().max(1000).nullable().optional(),
  media_items: z.array(z.record(z.string(), z.unknown())).optional(),
  models_3d: z.array(Model3DSchema).optional(),
  attachments: z.array(ProductAttachmentSchema).optional(),
  image_alts: z.array(ImageAltMetadataSchema).optional(),
  content_tree: z.record(z.string(), z.unknown()).nullable().optional(),
  content_diff: z.record(z.string(), z.unknown()).nullable().optional(),
  template_id: z.string().max(128).nullable().optional(),
  feature_ids: z.array(z.string().max(128)).optional(),
  option_metadata: z.array(ProductOptionMetadataSchema).optional(),
  storefront_overrides: z.array(StorefrontOverrideSchema).optional(),
  seo_metadata: ProductSeoMetadataSchema.nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const VariantImageItemSchema = z.union([
  z.string().min(1).max(2048),
  z.object({
    id: z.string().max(128).optional(),
    url: z.string().min(1).max(2048),
    alt: z.string().max(500).nullable().optional(),
    position: z.number().int().nonnegative().optional(),
  }),
])

export const UpsertVariantExtBodySchema = z.object({
  product_id: z.string().max(128).nullable().optional(),
  thumbnail: z.string().max(2048).nullable().optional(),
  images: z.array(VariantImageItemSchema).optional(),
  videos: z.array(VideoItemSchema).optional(),
  option_signature: z.string().max(255).nullable().optional(),
  swatch_color: z.string().max(16).nullable().optional(),
  swatch_image_url: z.string().max(2048).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const BulkAssignVariantMediaBodySchema = z.object({
  option_title: z.string().min(1).max(128),
  option_value: z.string().min(1).max(128),
  variants: z.array(
    z.object({
      variant_id: z.string().min(1).max(128),
      options: z.record(z.string(), z.string()),
    })
  ),
  thumbnail: z.string().max(2048).nullable().optional(),
  images: z.array(VariantImageItemSchema).optional(),
  videos: z.array(VideoItemSchema).optional(),
  swatch_color: z.string().max(16).nullable().optional(),
  swatch_image_url: z.string().max(2048).nullable().optional(),
  mode: z.enum(["replace", "append"]).optional(),
})

export const CreateAttributeDefinitionBodySchema = z.object({
  key: z.string().max(128).optional(),
  label: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  type: z.enum([
    "text",
    "number",
    "boolean",
    "select",
    "multiselect",
    "color",
    "unit",
    "file",
    "sortable_list",
  ]),
  unit_family: z
    .enum(["length", "mass", "volume", "area", "temperature", "power"])
    .nullable()
    .optional(),
  default_unit: z.string().max(16).nullable().optional(),
  allowed_units: z.array(z.string().max(16)).nullable().optional(),
  options: z
    .array(
      z.object({
        value: z.string().min(1).max(128),
        label: z.string().min(1).max(255),
        hex_color: z.string().max(16).nullable().optional(),
        icon_url: z.string().max(2048).nullable().optional(),
        sort_order: z.number().int().optional(),
      })
    )
    .nullable()
    .optional(),
  validation_rules: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      min_length: z.number().int().nonnegative().optional(),
      max_length: z.number().int().positive().optional(),
      pattern: z.string().max(255).optional(),
      allowed_mime_types: z.array(z.string().max(128)).optional(),
    })
    .nullable()
    .optional(),
  is_filterable: z.boolean().optional(),
  is_required: z.boolean().optional(),
  is_global: z.boolean().optional(),
  category_ids: z.array(z.string().max(128)).optional(),
  sort_order: z.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateAttributeDefinitionBodySchema =
  CreateAttributeDefinitionBodySchema.partial()

export const SetProductAttributesBodySchema = z.object({
  template_id_or_code: z.string().max(128).optional(),
  attributes: z
    .array(
      z.object({
        attribute_key: z.string().min(1).max(128),
        value: z.unknown(),
        unit: z.string().max(16).nullable().optional(),
        sort_order: z.number().int().optional(),
        locale: z.string().max(32).nullable().optional(),
      })
    )
    .optional(),
})

export const CreateAttributeTemplateBodySchema = z.object({
  code: z.string().max(128).optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  category_ids: z.array(z.string().max(128)).optional(),
  attribute_keys: z.array(z.string().max(128)).optional(),
  content_tree: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateAttributeTemplateBodySchema =
  CreateAttributeTemplateBodySchema.partial()

export const CreateProductFeatureBodySchema = z.object({
  code: z.string().max(128).optional(),
  title: z.string().min(1).max(255),
  subtitle: z.string().max(500).nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
  icon_url: z.string().max(2048).nullable().optional(),
  icon_name: z.string().max(128).nullable().optional(),
  badge_color: z.string().max(32).nullable().optional(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
})

export const UpdateProductFeatureBodySchema =
  CreateProductFeatureBodySchema.partial()

export const ImportImageAltsBodySchema = z.object({
  csv_content: z.string().min(1).max(500000),
})

export const StoreFilterByAttributesBodySchema = z.object({
  criteria: z.array(
    z.object({
      attribute_key: z.string().min(1).max(128),
      eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
      in: z.array(z.union([z.string(), z.number()])).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      unit: z.string().max(16).optional(),
    })
  ),
})
