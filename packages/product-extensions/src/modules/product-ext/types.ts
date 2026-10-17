export const PRODUCT_EXT_MODULE = "ProductExt"
export const PRODUCT_EXT_MODULE_KEY = "product_ext"

export type VideoProviderType =
  | "file"
  | "youtube"
  | "vimeo"
  | "mux"
  | "cloudflare_stream"
  | "external"

export interface VideoMediaItem {
  id: string
  url: string
  provider: VideoProviderType
  embed_id?: string | null
  embed_url?: string | null
  poster_url?: string | null
  captions_url?: string | null
  mime_type?: string | null
  title?: string | null
  alt?: string | null
  duration_seconds?: number | null
  position?: number
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
}

export type VideoInput = string | Partial<VideoMediaItem> & { url: string }

export interface Model3DItem {
  id: string
  glb_url: string
  usdz_url?: string | null
  poster_url?: string | null
  title?: string | null
  alt?: string | null
  position?: number
  ar_scale?: "auto" | "fixed"
}

export type AttachmentCategory =
  | "manual"
  | "datasheet"
  | "size_guide"
  | "certificate"
  | "warranty"
  | "other"

export interface ProductAttachmentItem {
  id: string
  url: string
  filename: string
  label: string
  category?: AttachmentCategory
  mime_type?: string | null
  size_bytes?: number | null
  locale?: string | null
  position?: number
}

export interface ImageAltMetadata {
  image_id?: string | null
  image_url: string
  alt: string
  title?: string | null
  caption?: string | null
  focal_point?: { x: number; y: number } | null
  locale?: string | null
}

export interface UnifiedMediaEntry {
  id: string
  kind: "image" | "video" | "model_3d"
  url: string
  thumbnail_url?: string | null
  alt?: string | null
  title?: string | null
  position: number
  provider?: VideoProviderType
  embed_url?: string | null
  usdz_url?: string | null
  captions_url?: string | null
  mime_type?: string | null
}

export interface VariantImageItem {
  id?: string
  url: string
  alt?: string | null
  position?: number
}

export interface OptionValueSwatchMetadata {
  option_title: string
  value: string
  hex_color?: string | null
  secondary_hex_color?: string | null
  swatch_image_url?: string | null
  description?: string | null
}

export interface ProductOptionMetadata {
  option_title: string
  display_style?: "buttons" | "color_swatch" | "image_swatch" | "dropdown"
  size_chart_url?: string | null
  tooltip?: string | null
  values?: OptionValueSwatchMetadata[]
}

export type AttributeValueType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "color"
  | "unit"
  | "file"
  | "sortable_list"

export type UnitFamily =
  | "length"
  | "mass"
  | "volume"
  | "area"
  | "temperature"
  | "power"

export type UnitCode =
  | "mm"
  | "cm"
  | "m"
  | "in"
  | "ft"
  | "mg"
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "l"
  | "fl_oz"
  | "gal"
  | "cm2"
  | "m2"
  | "sq_in"
  | "sq_ft"
  | "c"
  | "f"
  | "k"
  | "w"
  | "kw"
  | "hp"

export interface AttributeOptionChoice {
  value: string
  label: string
  hex_color?: string | null
  icon_url?: string | null
  sort_order?: number
}

export interface AttributeValidationRules {
  min?: number
  max?: number
  min_length?: number
  max_length?: number
  pattern?: string
  allowed_mime_types?: string[]
}

export interface AttributeDefinitionDTO {
  id: string
  key: string
  label: string
  description?: string | null
  type: AttributeValueType
  unit_family?: UnitFamily | null
  default_unit?: UnitCode | null
  allowed_units?: UnitCode[] | null
  options?: AttributeOptionChoice[] | null
  validation_rules?: AttributeValidationRules | null
  is_filterable: boolean
  is_required: boolean
  is_global: boolean
  category_ids: string[]
  sort_order: number
  metadata?: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface CreateAttributeDefinitionInput {
  key?: string
  label: string
  description?: string | null
  type: AttributeValueType
  unit_family?: UnitFamily | null
  default_unit?: UnitCode | null
  allowed_units?: UnitCode[] | null
  options?: AttributeOptionChoice[] | null
  validation_rules?: AttributeValidationRules | null
  is_filterable?: boolean
  is_required?: boolean
  is_global?: boolean
  category_ids?: string[]
  sort_order?: number
  metadata?: Record<string, unknown> | null
}

export interface UpdateAttributeDefinitionInput {
  id: string
  label?: string
  description?: string | null
  type?: AttributeValueType
  unit_family?: UnitFamily | null
  default_unit?: UnitCode | null
  allowed_units?: UnitCode[] | null
  options?: AttributeOptionChoice[] | null
  validation_rules?: AttributeValidationRules | null
  is_filterable?: boolean
  is_required?: boolean
  is_global?: boolean
  category_ids?: string[]
  sort_order?: number
  metadata?: Record<string, unknown> | null
}

export interface ProductAttributeValueDTO {
  id: string
  product_id: string
  attribute_id: string
  attribute_key: string
  value_text?: string | null
  value_number?: number | null
  value_boolean?: boolean | null
  value_json?: unknown
  unit?: UnitCode | null
  value_normalized_si?: number | null
  sort_order: number
  locale?: string | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface UpsertProductAttributeValueInput {
  attribute_key: string
  value: unknown
  unit?: UnitCode | null
  sort_order?: number
  locale?: string | null
}

export interface AttributeFilterCriterion {
  attribute_key: string
  eq?: string | number | boolean
  in?: Array<string | number>
  min?: number
  max?: number
  unit?: UnitCode
}

export type ContentBlockV1 =
  | {
      type: "markdown"
      text: string
    }
  | {
      type: "list"
      style?: "unordered" | "ordered"
      items: string[]
    }
  | {
      type: "key_value"
      pairs: Array<{ label: string; value: string }>
    }

export interface TreeNodeBaseV1 {
  id: string
  parent_id: string | null
  type: "root" | "section" | "item"
  order?: number
  hidden?: boolean
}

export interface TreeRootNodeV1 extends TreeNodeBaseV1 {
  type: "root"
  parent_id: null
}

export interface TreeSectionNodeV1 extends TreeNodeBaseV1 {
  type: "section"
  title: string
  icon?: string
}

export interface TreeItemNodeV1 extends TreeNodeBaseV1 {
  type: "item"
  title: string
  blocks: ContentBlockV1[]
}

export type TreeNodeV1 = TreeRootNodeV1 | TreeSectionNodeV1 | TreeItemNodeV1

export interface TreeDocV1 {
  schema: "tree@1"
  root_id: string
  nodes: Record<string, TreeNodeV1>
}

export interface TreeNodePatchV1 {
  parent_id?: string | null
  order?: number
  hidden?: boolean
  title?: string
  icon?: string
  blocks?: ContentBlockV1[]
}

export interface DiffDocV1 {
  schema: "diff@1"
  base_template_id?: string | null
  patches?: Record<string, TreeNodePatchV1>
  added_nodes?: Record<string, TreeNodeV1>
  deleted_node_ids?: string[]
}

export interface ResolvedItemNodeV1 {
  id: string
  title: string
  order: number
  blocks: ContentBlockV1[]
}

export interface ResolvedSectionNodeV1 {
  id: string
  title: string
  icon?: string
  order: number
  items: ResolvedItemNodeV1[]
}

export interface ResolvedTreeV1 {
  root_id: string
  sections: ResolvedSectionNodeV1[]
}

export interface AttributeTemplateDTO {
  id: string
  code: string
  name: string
  description?: string | null
  category_ids: string[]
  attribute_keys: string[]
  content_tree: TreeDocV1
  is_active: boolean
  metadata?: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface CreateAttributeTemplateInput {
  code?: string
  name: string
  description?: string | null
  category_ids?: string[]
  attribute_keys?: string[]
  content_tree?: TreeDocV1
  is_active?: boolean
  metadata?: Record<string, unknown> | null
}

export interface UpdateAttributeTemplateInput {
  id: string
  code?: string
  name?: string
  description?: string | null
  category_ids?: string[]
  attribute_keys?: string[]
  content_tree?: TreeDocV1
  is_active?: boolean
  metadata?: Record<string, unknown> | null
}

export interface ProductFeatureDTO {
  id: string
  code: string
  title: string
  subtitle?: string | null
  description?: string | null
  icon_url?: string | null
  icon_name?: string | null
  badge_color?: string | null
  sort_order: number
  is_active: boolean
  metadata?: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface CreateProductFeatureInput {
  code?: string
  title: string
  subtitle?: string | null
  description?: string | null
  icon_url?: string | null
  icon_name?: string | null
  badge_color?: string | null
  sort_order?: number
  is_active?: boolean
  metadata?: Record<string, unknown> | null
}

export interface UpdateProductFeatureInput {
  id: string
  code?: string
  title?: string
  subtitle?: string | null
  description?: string | null
  icon_url?: string | null
  icon_name?: string | null
  badge_color?: string | null
  sort_order?: number
  is_active?: boolean
  metadata?: Record<string, unknown> | null
}

export interface StorefrontPresentationOverride {
  scope_key: string
  sales_channel_id?: string | null
  locale?: string | null
  title?: string | null
  subtitle?: string | null
  tagline?: string | null
  description?: string | null
  handle?: string | null
  badges?: string[]
  videos?: VideoInput[]
  media_items?: UnifiedMediaEntry[]
  seo_title?: string | null
  seo_description?: string | null
}

export interface ProductSeoMetadata {
  meta_title?: string | null
  meta_description?: string | null
  canonical_url?: string | null
  og_image_url?: string | null
  keywords?: string[]
  noindex?: boolean
}

export interface ProductExtensionDTO {
  id: string
  product_id: string
  videos: string[]
  tagline: string | null
  media_items: VideoMediaItem[]
  models_3d: Model3DItem[]
  attachments: ProductAttachmentItem[]
  image_alts: ImageAltMetadata[]
  content_tree: TreeDocV1 | null
  content_diff: DiffDocV1 | null
  template_id: string | null
  feature_ids: string[]
  option_metadata: ProductOptionMetadata[]
  storefront_overrides: StorefrontPresentationOverride[]
  seo_metadata: ProductSeoMetadata | null
  metadata: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface VariantExtensionDTO {
  id: string
  variant_id: string
  product_id: string | null
  thumbnail: string | null
  images: VariantImageItem[]
  videos: string[]
  media_items: VideoMediaItem[]
  option_signature: string | null
  swatch_color: string | null
  swatch_image_url: string | null
  metadata: Record<string, unknown> | null
  created_at?: Date | string
  updated_at?: Date | string
}

export interface UpsertProductExtensionInput {
  product_id: string
  videos?: VideoInput[]
  tagline?: string | null
  media_items?: VideoMediaItem[]
  models_3d?: Model3DItem[]
  attachments?: ProductAttachmentItem[]
  image_alts?: ImageAltMetadata[]
  content_tree?: TreeDocV1 | null
  content_diff?: DiffDocV1 | null
  template_id?: string | null
  feature_ids?: string[]
  option_metadata?: ProductOptionMetadata[]
  storefront_overrides?: StorefrontPresentationOverride[]
  seo_metadata?: ProductSeoMetadata | null
  metadata?: Record<string, unknown> | null
}

export interface UpsertVariantExtensionInput {
  variant_id: string
  product_id?: string | null
  thumbnail?: string | null
  images?: Array<string | VariantImageItem>
  videos?: VideoInput[]
  media_items?: VideoMediaItem[]
  option_signature?: string | null
  swatch_color?: string | null
  swatch_image_url?: string | null
  metadata?: Record<string, unknown> | null
}

export interface VariantOptionCandidate {
  variant_id: string
  options: Record<string, string>
}

export interface BulkAssignVariantMediaByOptionInput {
  product_id: string
  option_title: string
  option_value: string
  variants: VariantOptionCandidate[]
  thumbnail?: string | null
  images?: Array<string | VariantImageItem>
  videos?: VideoInput[]
  swatch_color?: string | null
  swatch_image_url?: string | null
  mode?: "replace" | "append"
}

export interface ResolvedProductAttributeEntry {
  definition: AttributeDefinitionDTO
  value: ProductAttributeValueDTO
  display_value: string
}

export interface StorefrontVariantExtensionSummary {
  variant_id: string
  thumbnail: string | null
  images: VariantImageItem[]
  videos: string[]
  media_items: VideoMediaItem[]
  option_signature: string | null
  swatch_color: string | null
  swatch_image_url: string | null
}

export interface StorefrontProductExtensionResponse {
  product_id: string
  videos: string[]
  tagline: string | null
  media_items: VideoMediaItem[]
  media_gallery: UnifiedMediaEntry[]
  models_3d: Model3DItem[]
  attachments: ProductAttachmentItem[]
  image_alts: ImageAltMetadata[]
  content_sections: ResolvedSectionNodeV1[]
  features: ProductFeatureDTO[]
  attributes: ResolvedProductAttributeEntry[]
  option_metadata: ProductOptionMetadata[]
  seo_metadata: ProductSeoMetadata | null
  resolved_override: StorefrontPresentationOverride | null
  variants?: Record<string, StorefrontVariantExtensionSummary>
}
