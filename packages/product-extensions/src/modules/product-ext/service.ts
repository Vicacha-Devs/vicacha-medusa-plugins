import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import {
  AttributeDefinition,
  AttributeTemplate,
  ProductAttributeValue,
  ProductExtension,
  ProductFeature,
  VariantExtension,
} from "./models"
import type {
  AttributeDefinitionDTO,
  AttributeFilterCriterion,
  AttributeOptionChoice,
  AttributeTemplateDTO,
  AttributeValidationRules,
  BulkAssignVariantMediaByOptionInput,
  CreateAttributeDefinitionInput,
  CreateAttributeTemplateInput,
  CreateProductFeatureInput,
  DiffDocV1,
  ImageAltMetadata,
  ProductAttributeValueDTO,
  ProductExtensionDTO,
  ProductFeatureDTO,
  ProductOptionMetadata,
  ProductSeoMetadata,
  ResolvedProductAttributeEntry,
  StorefrontPresentationOverride,
  StorefrontProductExtensionResponse,
  StorefrontVariantExtensionSummary,
  TreeDocV1,
  UnitCode,
  UpdateAttributeDefinitionInput,
  UpdateAttributeTemplateInput,
  UpdateProductFeatureInput,
  UpsertProductAttributeValueInput,
  UpsertProductExtensionInput,
  UpsertVariantExtensionInput,
  VariantExtensionDTO,
} from "./types"
import {
  createEmptyTree,
  resolveTree,
  validateDiffDocV1,
  validateTreeDocV1,
} from "./utils/content-tree"
import {
  buildUnifiedProductMedia,
  type CsvImageAltRow,
  exportImageAltsToCsv,
  normalizeAttachmentsList,
  normalizeModel3DList,
  normalizeVariantImages,
  normalizeVideoList,
  parseImageAltsFromCsv,
} from "./utils/media-parser"
import {
  slugifyAttributeKey,
  validateExternalMediaUrl,
  validateHexColor,
} from "./utils/security"
import { formatUnitDisplay, normalizeToSI } from "./utils/unit-converter"

function asJsonRecord(val: unknown): Record<string, unknown> | null {
  if (val === null || val === undefined) {
    return null
  }
  return val as unknown as Record<string, unknown>
}

function asRecord(val: unknown): Record<string, unknown> {
  return val as unknown as Record<string, unknown>
}

function normalizeProductExtensionRecord(
  raw: Record<string, unknown>
): ProductExtensionDTO {
  return {
    id: String(raw.id),
    product_id: String(raw.product_id),
    videos: Array.isArray(raw.videos) ? (raw.videos as string[]) : [],
    tagline:
      raw.tagline !== undefined && raw.tagline !== null
        ? String(raw.tagline)
        : null,
    media_items: Array.isArray(raw.media_items)
      ? (raw.media_items as ProductExtensionDTO["media_items"])
      : [],
    models_3d: Array.isArray(raw.models_3d)
      ? (raw.models_3d as ProductExtensionDTO["models_3d"])
      : [],
    attachments: Array.isArray(raw.attachments)
      ? (raw.attachments as ProductExtensionDTO["attachments"])
      : [],
    image_alts: Array.isArray(raw.image_alts)
      ? (raw.image_alts as ImageAltMetadata[])
      : [],
    content_tree: (raw.content_tree as TreeDocV1 | null) ?? null,
    content_diff: (raw.content_diff as DiffDocV1 | null) ?? null,
    template_id:
      raw.template_id !== undefined && raw.template_id !== null
        ? String(raw.template_id)
        : null,
    feature_ids: Array.isArray(raw.feature_ids)
      ? (raw.feature_ids as string[])
      : [],
    option_metadata: Array.isArray(raw.option_metadata)
      ? (raw.option_metadata as ProductOptionMetadata[])
      : [],
    storefront_overrides: Array.isArray(raw.storefront_overrides)
      ? (raw.storefront_overrides as StorefrontPresentationOverride[])
      : [],
    seo_metadata: (raw.seo_metadata as ProductSeoMetadata | null) ?? null,
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

function normalizeVariantExtensionRecord(
  raw: Record<string, unknown>
): VariantExtensionDTO {
  return {
    id: String(raw.id),
    variant_id: String(raw.variant_id),
    product_id:
      raw.product_id !== undefined && raw.product_id !== null
        ? String(raw.product_id)
        : null,
    thumbnail:
      raw.thumbnail !== undefined && raw.thumbnail !== null
        ? String(raw.thumbnail)
        : null,
    images: Array.isArray(raw.images)
      ? (raw.images as VariantExtensionDTO["images"])
      : [],
    videos: Array.isArray(raw.videos) ? (raw.videos as string[]) : [],
    media_items: Array.isArray(raw.media_items)
      ? (raw.media_items as VariantExtensionDTO["media_items"])
      : [],
    option_signature:
      raw.option_signature !== undefined && raw.option_signature !== null
        ? String(raw.option_signature)
        : null,
    swatch_color:
      raw.swatch_color !== undefined && raw.swatch_color !== null
        ? String(raw.swatch_color)
        : null,
    swatch_image_url:
      raw.swatch_image_url !== undefined && raw.swatch_image_url !== null
        ? String(raw.swatch_image_url)
        : null,
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

function normalizeAttributeDefinitionRecord(
  raw: Record<string, unknown>
): AttributeDefinitionDTO {
  return {
    id: String(raw.id),
    key: String(raw.key),
    label: String(raw.label),
    description:
      raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : null,
    type: (raw.type as AttributeDefinitionDTO["type"]) ?? "text",
    unit_family:
      (raw.unit_family as AttributeDefinitionDTO["unit_family"]) ?? null,
    default_unit:
      (raw.default_unit as AttributeDefinitionDTO["default_unit"]) ?? null,
    allowed_units: Array.isArray(raw.allowed_units)
      ? (raw.allowed_units as UnitCode[])
      : null,
    options: Array.isArray(raw.options)
      ? (raw.options as AttributeOptionChoice[])
      : null,
    validation_rules:
      (raw.validation_rules as AttributeValidationRules | null) ?? null,
    is_filterable: Boolean(raw.is_filterable ?? true),
    is_required: Boolean(raw.is_required ?? false),
    is_global: Boolean(raw.is_global ?? false),
    category_ids: Array.isArray(raw.category_ids)
      ? (raw.category_ids as string[])
      : [],
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

function normalizeAttributeTemplateRecord(
  raw: Record<string, unknown>
): AttributeTemplateDTO {
  return {
    id: String(raw.id),
    code: String(raw.code),
    name: String(raw.name),
    description:
      raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : null,
    category_ids: Array.isArray(raw.category_ids)
      ? (raw.category_ids as string[])
      : [],
    attribute_keys: Array.isArray(raw.attribute_keys)
      ? (raw.attribute_keys as string[])
      : [],
    content_tree:
      (raw.content_tree as TreeDocV1 | null) ?? createEmptyTree("root"),
    is_active: Boolean(raw.is_active ?? true),
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

function normalizeProductFeatureRecord(
  raw: Record<string, unknown>
): ProductFeatureDTO {
  return {
    id: String(raw.id),
    code: String(raw.code),
    title: String(raw.title),
    subtitle:
      raw.subtitle !== undefined && raw.subtitle !== null
        ? String(raw.subtitle)
        : null,
    description:
      raw.description !== undefined && raw.description !== null
        ? String(raw.description)
        : null,
    icon_url:
      raw.icon_url !== undefined && raw.icon_url !== null
        ? String(raw.icon_url)
        : null,
    icon_name:
      raw.icon_name !== undefined && raw.icon_name !== null
        ? String(raw.icon_name)
        : null,
    badge_color:
      raw.badge_color !== undefined && raw.badge_color !== null
        ? String(raw.badge_color)
        : null,
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    is_active: Boolean(raw.is_active ?? true),
    metadata: (raw.metadata as Record<string, unknown> | null) ?? null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

function normalizeProductAttributeValueRecord(
  raw: Record<string, unknown>
): ProductAttributeValueDTO {
  return {
    id: String(raw.id),
    product_id: String(raw.product_id),
    attribute_id: String(raw.attribute_id),
    attribute_key: String(raw.attribute_key),
    value_text:
      raw.value_text !== undefined && raw.value_text !== null
        ? String(raw.value_text)
        : null,
    value_number:
      typeof raw.value_number === "number" ? raw.value_number : null,
    value_boolean:
      typeof raw.value_boolean === "boolean" ? raw.value_boolean : null,
    value_json: raw.value_json ?? null,
    unit: (raw.unit as UnitCode | null) ?? null,
    value_normalized_si:
      typeof raw.value_normalized_si === "number"
        ? raw.value_normalized_si
        : null,
    sort_order: typeof raw.sort_order === "number" ? raw.sort_order : 0,
    locale:
      raw.locale !== undefined && raw.locale !== null
        ? String(raw.locale)
        : null,
    created_at: raw.created_at as Date | string | undefined,
    updated_at: raw.updated_at as Date | string | undefined,
  }
}

export class ProductExtModuleService extends MedusaService({
  ProductExtension,
  VariantExtension,
  AttributeDefinition,
  AttributeTemplate,
  ProductAttributeValue,
  ProductFeature,
}) {
  // ---------------------------------------------------------------------------
  // 1. ProductExtension CRUD (100% compatible with @bambiste/medusa-product-ext)
  // ---------------------------------------------------------------------------

  async getByProductId(productId: string): Promise<ProductExtensionDTO | null> {
    if (!productId || !productId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required"
      )
    }
    const list = (await this.listProductExtensions({
      product_id: productId.trim(),
    })) as unknown as Array<Record<string, unknown>>

    return list[0] ? normalizeProductExtensionRecord(list[0]) : null
  }

  async upsertByProductIdWithState(input: UpsertProductExtensionInput): Promise<{
    record: ProductExtensionDTO
    wasNew: boolean
    previousState: ProductExtensionDTO | null
  }> {
    const productId = String(input.product_id ?? "").trim()
    if (!productId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required"
      )
    }

    const existing = await this.getByProductId(productId)

    const shouldUpdateMedia =
      input.videos !== undefined || input.media_items !== undefined
    const normalizedMedia = shouldUpdateMedia
      ? normalizeVideoList(input.videos, input.media_items)
      : {
          videoUrls: existing?.videos ?? [],
          mediaItems: existing?.media_items ?? [],
        }

    const models3d =
      input.models_3d !== undefined
        ? normalizeModel3DList(input.models_3d)
        : existing?.models_3d ?? []

    const attachments =
      input.attachments !== undefined
        ? normalizeAttachmentsList(input.attachments)
        : existing?.attachments ?? []

    const imageAlts: ImageAltMetadata[] =
      input.image_alts !== undefined
        ? (input.image_alts ?? []).map((item, idx) => ({
            image_id: item.image_id ?? null,
            image_url: validateExternalMediaUrl(item.image_url, {
              allowRelative: true,
              fieldName: `image_alts[${idx}].image_url`,
            }),
            alt: String(item.alt ?? "").trim(),
            title: item.title ?? null,
            caption: item.caption ?? null,
            focal_point: item.focal_point ?? null,
            locale: item.locale ?? null,
          }))
        : existing?.image_alts ?? []

    const contentTree =
      input.content_tree !== undefined
        ? input.content_tree
          ? validateTreeDocV1(input.content_tree)
          : null
        : existing?.content_tree ?? null

    const contentDiff =
      input.content_diff !== undefined
        ? input.content_diff
          ? validateDiffDocV1(input.content_diff)
          : null
        : existing?.content_diff ?? null

    const payload = {
      product_id: productId,
      videos: asJsonRecord(normalizedMedia.videoUrls),
      tagline:
        input.tagline !== undefined
          ? input.tagline
          : existing?.tagline ?? null,
      media_items: asJsonRecord(normalizedMedia.mediaItems),
      models_3d: asJsonRecord(models3d),
      attachments: asJsonRecord(attachments),
      image_alts: asJsonRecord(imageAlts),
      content_tree: asJsonRecord(contentTree),
      content_diff: asJsonRecord(contentDiff),
      template_id:
        input.template_id !== undefined
          ? input.template_id
          : existing?.template_id ?? null,
      feature_ids: asJsonRecord(
        input.feature_ids !== undefined
          ? input.feature_ids
          : existing?.feature_ids ?? []
      ),
      option_metadata: asJsonRecord(
        input.option_metadata !== undefined
          ? input.option_metadata
          : existing?.option_metadata ?? []
      ),
      storefront_overrides: asJsonRecord(
        input.storefront_overrides !== undefined
          ? input.storefront_overrides
          : existing?.storefront_overrides ?? []
      ),
      seo_metadata: asJsonRecord(
        input.seo_metadata !== undefined
          ? input.seo_metadata
          : existing?.seo_metadata ?? null
      ),
      metadata: asJsonRecord(
        input.metadata !== undefined
          ? input.metadata
          : existing?.metadata ?? null
      ),
    }

    if (existing) {
      const updated = asRecord(
        await this.updateProductExtensions({
          id: existing.id,
          ...payload,
        })
      )
      return {
        record: normalizeProductExtensionRecord(updated),
        wasNew: false,
        previousState: existing,
      }
    }

    const created = asRecord(await this.createProductExtensions(payload))
    return {
      record: normalizeProductExtensionRecord(created),
      wasNew: true,
      previousState: null,
    }
  }

  async upsertByProductId(
    input: UpsertProductExtensionInput
  ): Promise<ProductExtensionDTO> {
    const { record } = await this.upsertByProductIdWithState(input)
    return record
  }

  async deleteByProductId(productId: string): Promise<void> {
    const existing = await this.getByProductId(productId)
    if (existing) {
      await this.deleteProductExtensions([existing.id])
    }
  }

  // ---------------------------------------------------------------------------
  // 2. VariantExtension CRUD & Base-Option Bulk Media Assignment
  // ---------------------------------------------------------------------------

  async getByVariantId(variantId: string): Promise<VariantExtensionDTO | null> {
    if (!variantId || !variantId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "variant_id is required"
      )
    }
    const list = (await this.listVariantExtensions({
      variant_id: variantId.trim(),
    })) as unknown as Array<Record<string, unknown>>
    return list[0] ? normalizeVariantExtensionRecord(list[0]) : null
  }

  async getByVariantIds(variantIds: string[]): Promise<VariantExtensionDTO[]> {
    if (!Array.isArray(variantIds) || variantIds.length === 0) {
      return []
    }
    const wanted = new Set(variantIds.map((v) => v.trim()).filter(Boolean))
    const all = (await this.listVariantExtensions({})) as unknown as Array<
      Record<string, unknown>
    >
    return all
      .map(normalizeVariantExtensionRecord)
      .filter((row) => wanted.has(row.variant_id))
  }

  async listByProductId(productId: string): Promise<VariantExtensionDTO[]> {
    if (!productId || !productId.trim()) {
      return []
    }
    const rows = (await this.listVariantExtensions({
      product_id: productId.trim(),
    })) as unknown as Array<Record<string, unknown>>
    return rows.map(normalizeVariantExtensionRecord)
  }

  async upsertByVariantIdWithState(input: UpsertVariantExtensionInput): Promise<{
    record: VariantExtensionDTO
    wasNew: boolean
    previousState: VariantExtensionDTO | null
  }> {
    const variantId = String(input.variant_id ?? "").trim()
    if (!variantId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "variant_id is required"
      )
    }

    const existing = await this.getByVariantId(variantId)

    const shouldUpdateMedia =
      input.videos !== undefined || input.media_items !== undefined
    const normalizedMedia = shouldUpdateMedia
      ? normalizeVideoList(input.videos, input.media_items)
      : {
          videoUrls: existing?.videos ?? [],
          mediaItems: existing?.media_items ?? [],
        }

    const normalizedImages =
      input.images !== undefined
        ? normalizeVariantImages(input.images)
        : existing?.images ?? []

    const validatedThumbnail =
      input.thumbnail !== undefined
        ? input.thumbnail
          ? validateExternalMediaUrl(input.thumbnail, {
              allowRelative: true,
              fieldName: "variant.thumbnail",
            })
          : null
        : existing?.thumbnail ?? null

    const validatedSwatchColor =
      input.swatch_color !== undefined
        ? input.swatch_color
          ? validateHexColor(input.swatch_color, "swatch_color")
          : null
        : existing?.swatch_color ?? null

    const validatedSwatchImage =
      input.swatch_image_url !== undefined
        ? input.swatch_image_url
          ? validateExternalMediaUrl(input.swatch_image_url, {
              allowRelative: true,
              fieldName: "variant.swatch_image_url",
            })
          : null
        : existing?.swatch_image_url ?? null

    const payload = {
      variant_id: variantId,
      product_id:
        input.product_id !== undefined
          ? input.product_id
          : existing?.product_id ?? null,
      thumbnail: validatedThumbnail,
      images: asJsonRecord(normalizedImages),
      videos: asJsonRecord(normalizedMedia.videoUrls),
      media_items: asJsonRecord(normalizedMedia.mediaItems),
      option_signature:
        input.option_signature !== undefined
          ? input.option_signature
          : existing?.option_signature ?? null,
      swatch_color: validatedSwatchColor,
      swatch_image_url: validatedSwatchImage,
      metadata: asJsonRecord(
        input.metadata !== undefined
          ? input.metadata
          : existing?.metadata ?? null
      ),
    }

    if (existing) {
      const updated = asRecord(
        await this.updateVariantExtensions({
          id: existing.id,
          ...payload,
        })
      )
      return {
        record: normalizeVariantExtensionRecord(updated),
        wasNew: false,
        previousState: existing,
      }
    }

    const created = asRecord(await this.createVariantExtensions(payload))
    return {
      record: normalizeVariantExtensionRecord(created),
      wasNew: true,
      previousState: null,
    }
  }

  async upsertByVariantId(
    input: UpsertVariantExtensionInput
  ): Promise<VariantExtensionDTO> {
    const { record } = await this.upsertByVariantIdWithState(input)
    return record
  }

  async deleteByVariantId(variantId: string): Promise<void> {
    const existing = await this.getByVariantId(variantId)
    if (existing) {
      await this.deleteVariantExtensions([existing.id])
    }
  }

  async bulkAssignVariantMediaByOption(
    input: BulkAssignVariantMediaByOptionInput
  ): Promise<{
    updated: VariantExtensionDTO[]
    states: Array<{
      variant_id: string
      wasNew: boolean
      previousState: VariantExtensionDTO | null
    }>
  }> {
    const optionTitle = String(input.option_title ?? "").trim()
    const optionValue = String(input.option_value ?? "").trim()
    if (!optionTitle || !optionValue) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "option_title and option_value are required for bulk variant media assignment"
      )
    }

    const matchingVariants = (input.variants ?? []).filter((candidate) => {
      const entries = Object.entries(candidate.options ?? {})
      return entries.some(
        ([k, v]) =>
          k.trim().toLowerCase() === optionTitle.toLowerCase() &&
          String(v).trim().toLowerCase() === optionValue.toLowerCase()
      )
    })

    const updated: VariantExtensionDTO[] = []
    const states: Array<{
      variant_id: string
      wasNew: boolean
      previousState: VariantExtensionDTO | null
    }> = []

    const mode = input.mode ?? "replace"
    const signature = `${optionTitle}:${optionValue}`

    for (const candidate of matchingVariants) {
      const current = await this.getByVariantId(candidate.variant_id)
      const nextImages =
        mode === "append" && current
          ? [
              ...current.images,
              ...normalizeVariantImages(input.images ?? []),
            ]
          : input.images

      const nextVideos =
        mode === "append" && current && input.videos
          ? [...current.videos, ...input.videos]
          : input.videos

      const res = await this.upsertByVariantIdWithState({
        variant_id: candidate.variant_id,
        product_id: input.product_id,
        thumbnail:
          input.thumbnail !== undefined
            ? input.thumbnail
            : current?.thumbnail ?? null,
        images: nextImages,
        videos: nextVideos,
        option_signature: signature,
        swatch_color:
          input.swatch_color !== undefined
            ? input.swatch_color
            : current?.swatch_color ?? null,
        swatch_image_url:
          input.swatch_image_url !== undefined
            ? input.swatch_image_url
            : current?.swatch_image_url ?? null,
      })

      updated.push(res.record)
      states.push({
        variant_id: candidate.variant_id,
        wasNew: res.wasNew,
        previousState: res.previousState,
      })
    }

    return { updated, states }
  }

  // ---------------------------------------------------------------------------
  // 3. Attribute Definitions & Category Inheritance
  // ---------------------------------------------------------------------------

  async getAttributeByKey(key: string): Promise<AttributeDefinitionDTO | null> {
    const normalizedKey = slugifyAttributeKey(key)
    const list = (await this.listAttributeDefinitions({
      key: normalizedKey,
    })) as unknown as Array<Record<string, unknown>>
    return list[0] ? normalizeAttributeDefinitionRecord(list[0]) : null
  }

  async createAttribute(
    input: CreateAttributeDefinitionInput
  ): Promise<AttributeDefinitionDTO> {
    const label = String(input.label ?? "").trim()
    if (!label) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Attribute label is required"
      )
    }

    const key = slugifyAttributeKey(input.key || label)
    const existing = await this.getAttributeByKey(key)
    if (existing) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Attribute with key "${key}" already exists`
      )
    }

    const created = asRecord(
      await this.createAttributeDefinitions({
        key,
        label,
        description: input.description ?? null,
        type: input.type,
        unit_family: input.unit_family ?? null,
        default_unit: input.default_unit ?? null,
        allowed_units: asJsonRecord(input.allowed_units ?? null),
        options: asJsonRecord(input.options ?? null),
        validation_rules: asJsonRecord(input.validation_rules ?? null),
        is_filterable: input.is_filterable ?? true,
        is_required: input.is_required ?? false,
        is_global: input.is_global ?? false,
        category_ids: asJsonRecord(input.category_ids ?? []),
        sort_order: input.sort_order ?? 0,
        metadata: asJsonRecord(input.metadata ?? null),
      })
    )

    return normalizeAttributeDefinitionRecord(created)
  }

  async updateAttribute(
    input: UpdateAttributeDefinitionInput
  ): Promise<AttributeDefinitionDTO> {
    const list = (await this.listAttributeDefinitions({
      id: input.id,
    })) as unknown as Array<Record<string, unknown>>
    if (!list[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Attribute "${input.id}" not found`
      )
    }
    const existing = normalizeAttributeDefinitionRecord(list[0])

    const updated = asRecord(
      await this.updateAttributeDefinitions({
        id: existing.id,
        label: input.label !== undefined ? input.label.trim() : existing.label,
        description:
          input.description !== undefined
            ? input.description
            : existing.description,
        type: input.type !== undefined ? input.type : existing.type,
        unit_family:
          input.unit_family !== undefined
            ? input.unit_family
            : existing.unit_family,
        default_unit:
          input.default_unit !== undefined
            ? input.default_unit
            : existing.default_unit,
        allowed_units: asJsonRecord(
          input.allowed_units !== undefined
            ? input.allowed_units
            : existing.allowed_units
        ),
        options: asJsonRecord(
          input.options !== undefined ? input.options : existing.options
        ),
        validation_rules: asJsonRecord(
          input.validation_rules !== undefined
            ? input.validation_rules
            : existing.validation_rules
        ),
        is_filterable:
          input.is_filterable !== undefined
            ? input.is_filterable
            : existing.is_filterable,
        is_required:
          input.is_required !== undefined
            ? input.is_required
            : existing.is_required,
        is_global:
          input.is_global !== undefined ? input.is_global : existing.is_global,
        category_ids: asJsonRecord(
          input.category_ids !== undefined
            ? input.category_ids
            : existing.category_ids
        ),
        sort_order:
          input.sort_order !== undefined
            ? input.sort_order
            : existing.sort_order,
        metadata: asJsonRecord(
          input.metadata !== undefined ? input.metadata : existing.metadata
        ),
      })
    )

    return normalizeAttributeDefinitionRecord(updated)
  }

  async deleteAttribute(idOrKey: string): Promise<void> {
    const all = (await this.listAttributeDefinitions({})) as unknown as Array<
      Record<string, unknown>
    >
    const match = all
      .map(normalizeAttributeDefinitionRecord)
      .find((a) => a.id === idOrKey || a.key === idOrKey)
    if (!match) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Attribute "${idOrKey}" not found`
      )
    }

    const values = (await this.listProductAttributeValues({
      attribute_id: match.id,
    })) as unknown as Array<Record<string, unknown>>
    if (values.length > 0) {
      await this.deleteProductAttributeValues(
        values.map((v) => String(v.id))
      )
    }
    await this.deleteAttributeDefinitions([match.id])
  }

  async listAttributes(filter?: {
    category_id?: string
    ancestor_category_ids?: string[]
    is_filterable?: boolean
    is_global?: boolean
  }): Promise<AttributeDefinitionDTO[]> {
    const rawList = (await this.listAttributeDefinitions(
      {}
    )) as unknown as Array<Record<string, unknown>>
    let items = rawList.map(normalizeAttributeDefinitionRecord)

    if (filter?.is_filterable !== undefined) {
      items = items.filter((a) => a.is_filterable === filter.is_filterable)
    }
    if (filter?.is_global !== undefined) {
      items = items.filter((a) => a.is_global === filter.is_global)
    }
    if (
      filter?.category_id ||
      (filter?.ancestor_category_ids && filter.ancestor_category_ids.length > 0)
    ) {
      const targetCategories = new Set<string>([
        ...(filter.category_id ? [filter.category_id] : []),
        ...(filter.ancestor_category_ids ?? []),
      ])
      items = items.filter(
        (a) =>
          a.is_global ||
          a.category_ids.some((catId) => targetCategories.has(catId))
      )
    }

    return items.sort((a, b) => a.sort_order - b.sort_order)
  }

  // ---------------------------------------------------------------------------
  // 4. Product Attribute Values & SI Normalization
  // ---------------------------------------------------------------------------

  private validateAndCoerceAttributeValue(
    def: AttributeDefinitionDTO,
    rawValue: unknown,
    rawUnit?: UnitCode | null
  ): {
    value_text: string | null
    value_number: number | null
    value_boolean: boolean | null
    value_json: unknown
    unit: UnitCode | null
    value_normalized_si: number | null
    display_value: string
  } {
    const rules = def.validation_rules ?? {}

    switch (def.type) {
      case "text": {
        const str = String(rawValue ?? "").trim()
        if (rules.min_length !== undefined && str.length < rules.min_length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Attribute "${def.key}" requires at least ${rules.min_length} characters`
          )
        }
        if (rules.max_length !== undefined && str.length > rules.max_length) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Attribute "${def.key}" exceeds max length of ${rules.max_length}`
          )
        }
        return {
          value_text: str,
          value_number: null,
          value_boolean: null,
          value_json: null,
          unit: null,
          value_normalized_si: null,
          display_value: str,
        }
      }

      case "number": {
        const num = Number(rawValue)
        if (!Number.isFinite(num)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Attribute "${def.key}" requires a finite number`
          )
        }
        if (rules.min !== undefined && num < rules.min) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Attribute "${def.key}" must be >= ${rules.min}`
          )
        }
        if (rules.max !== undefined && num > rules.max) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Attribute "${def.key}" must be <= ${rules.max}`
          )
        }
        return {
          value_text: String(num),
          value_number: num,
          value_boolean: null,
          value_json: null,
          unit: null,
          value_normalized_si: num,
          display_value: String(num),
        }
      }

      case "unit": {
        const num = Number(rawValue)
        if (!Number.isFinite(num)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Unit attribute "${def.key}" requires a finite number`
          )
        }
        const effectiveUnit = (rawUnit ?? def.default_unit) as UnitCode | null
        if (!effectiveUnit) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Unit attribute "${def.key}" requires a unit code`
          )
        }
        if (
          def.allowed_units &&
          def.allowed_units.length > 0 &&
          !def.allowed_units.includes(effectiveUnit)
        ) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `Unit "${effectiveUnit}" is not allowed for attribute "${def.key}"`
          )
        }
        const si = normalizeToSI(num, effectiveUnit, def.unit_family)
        return {
          value_text: formatUnitDisplay(num, effectiveUnit),
          value_number: num,
          value_boolean: null,
          value_json: { value: num, unit: effectiveUnit, si },
          unit: effectiveUnit,
          value_normalized_si: si,
          display_value: formatUnitDisplay(num, effectiveUnit),
        }
      }

      case "boolean": {
        const boolVal =
          typeof rawValue === "boolean"
            ? rawValue
            : String(rawValue).toLowerCase() === "true"
        return {
          value_text: boolVal ? "true" : "false",
          value_number: boolVal ? 1 : 0,
          value_boolean: boolVal,
          value_json: null,
          unit: null,
          value_normalized_si: boolVal ? 1 : 0,
          display_value: boolVal ? "Yes" : "No",
        }
      }

      case "color": {
        const hex = validateHexColor(String(rawValue ?? ""), def.key)
        return {
          value_text: hex,
          value_number: null,
          value_boolean: null,
          value_json: { hex },
          unit: null,
          value_normalized_si: null,
          display_value: hex,
        }
      }

      case "select": {
        const choice = String(rawValue ?? "").trim()
        if (def.options && def.options.length > 0) {
          const allowed = def.options.find((o) => o.value === choice)
          if (!allowed) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              `Value "${choice}" is not a valid option for attribute "${def.key}"`
            )
          }
          return {
            value_text: choice,
            value_number: null,
            value_boolean: null,
            value_json: allowed,
            unit: null,
            value_normalized_si: null,
            display_value: allowed.label || choice,
          }
        }
        return {
          value_text: choice,
          value_number: null,
          value_boolean: null,
          value_json: null,
          unit: null,
          value_normalized_si: null,
          display_value: choice,
        }
      }

      case "multiselect":
      case "sortable_list": {
        const list = Array.isArray(rawValue)
          ? rawValue.map((v) => String(v).trim()).filter(Boolean)
          : String(rawValue ?? "")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean)

        if (
          def.type === "multiselect" &&
          def.options &&
          def.options.length > 0
        ) {
          const allowedSet = new Set(def.options.map((o) => o.value))
          for (const item of list) {
            if (!allowedSet.has(item)) {
              throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `Option "${item}" is not valid for multiselect attribute "${def.key}"`
              )
            }
          }
        }

        return {
          value_text: list.join(", "),
          value_number: list.length,
          value_boolean: null,
          value_json: list,
          unit: null,
          value_normalized_si: null,
          display_value: list.join(", "),
        }
      }

      case "file": {
        const fileUrl = validateExternalMediaUrl(String(rawValue ?? ""), {
          allowRelative: true,
          fieldName: `attribute.${def.key}`,
        })
        return {
          value_text: fileUrl,
          value_number: null,
          value_boolean: null,
          value_json: { url: fileUrl },
          unit: null,
          value_normalized_si: null,
          display_value: fileUrl,
        }
      }
    }
  }

  async getProductAttributeValues(
    productId: string,
    locale?: string | null
  ): Promise<ResolvedProductAttributeEntry[]> {
    const rawValues = (await this.listProductAttributeValues({
      product_id: productId,
    })) as unknown as Array<Record<string, unknown>>

    const values = rawValues
      .map(normalizeProductAttributeValueRecord)
      .filter((v) => !locale || !v.locale || v.locale === locale)
      .sort((a, b) => a.sort_order - b.sort_order)

    const allDefs = await this.listAttributes()
    const defByKey = new Map(allDefs.map((d) => [d.key, d]))

    const resolved: ResolvedProductAttributeEntry[] = []
    for (const val of values) {
      const def = defByKey.get(val.attribute_key)
      if (!def) {
        continue
      }
      const displayValue =
        def.type === "unit" && val.value_number !== null && val.value_number !== undefined
          ? formatUnitDisplay(val.value_number, val.unit)
          : val.value_text ?? ""
      resolved.push({
        definition: def,
        value: val,
        display_value: displayValue,
      })
    }

    return resolved
  }

  async setProductAttributesWithState(
    productId: string,
    inputs: UpsertProductAttributeValueInput[]
  ): Promise<{
    values: ResolvedProductAttributeEntry[]
    previousValues: ProductAttributeValueDTO[]
  }> {
    if (!productId || !productId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required"
      )
    }

    const existingRaw = (await this.listProductAttributeValues({
      product_id: productId,
    })) as unknown as Array<Record<string, unknown>>
    const previousValues = existingRaw.map(normalizeProductAttributeValueRecord)

    for (const entry of inputs) {
      const key = slugifyAttributeKey(entry.attribute_key)
      const def = await this.getAttributeByKey(key)
      if (!def) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Attribute definition "${key}" does not exist`
        )
      }

      const coerced = this.validateAndCoerceAttributeValue(
        def,
        entry.value,
        entry.unit
      )

      const existingMatch = previousValues.find(
        (pv) =>
          pv.attribute_key === key &&
          (pv.locale ?? null) === (entry.locale ?? null)
      )

      if (existingMatch) {
        await this.updateProductAttributeValues({
          id: existingMatch.id,
          product_id: productId,
          attribute_id: def.id,
          attribute_key: def.key,
          value_text: coerced.value_text,
          value_number: coerced.value_number,
          value_boolean: coerced.value_boolean,
          value_json: asJsonRecord(coerced.value_json),
          unit: coerced.unit,
          value_normalized_si: coerced.value_normalized_si,
          sort_order: entry.sort_order ?? existingMatch.sort_order,
          locale: entry.locale ?? null,
        })
      } else {
        await this.createProductAttributeValues({
          product_id: productId,
          attribute_id: def.id,
          attribute_key: def.key,
          value_text: coerced.value_text,
          value_number: coerced.value_number,
          value_boolean: coerced.value_boolean,
          value_json: asJsonRecord(coerced.value_json),
          unit: coerced.unit,
          value_normalized_si: coerced.value_normalized_si,
          sort_order: entry.sort_order ?? def.sort_order,
          locale: entry.locale ?? null,
        })
      }
    }

    const values = await this.getProductAttributeValues(productId)
    return { values, previousValues }
  }

  async rollbackProductAttributeValues(
    productId: string,
    previousValues: ProductAttributeValueDTO[]
  ): Promise<void> {
    const currentRaw = (await this.listProductAttributeValues({
      product_id: productId,
    })) as unknown as Array<Record<string, unknown>>
    if (currentRaw.length > 0) {
      await this.deleteProductAttributeValues(
        currentRaw.map((r) => String(r.id))
      )
    }
    for (const prev of previousValues) {
      await this.createProductAttributeValues({
        product_id: prev.product_id,
        attribute_id: prev.attribute_id,
        attribute_key: prev.attribute_key,
        value_text: prev.value_text ?? null,
        value_number: prev.value_number ?? null,
        value_boolean: prev.value_boolean ?? null,
        value_json: asJsonRecord(prev.value_json ?? null),
        unit: prev.unit ?? null,
        value_normalized_si: prev.value_normalized_si ?? null,
        sort_order: prev.sort_order,
        locale: prev.locale ?? null,
      })
    }
  }

  async filterProductIdsByAttributes(
    criteria: AttributeFilterCriterion[]
  ): Promise<string[]> {
    if (!Array.isArray(criteria) || criteria.length === 0) {
      return []
    }

    const allRaw = (await this.listProductAttributeValues(
      {}
    )) as unknown as Array<Record<string, unknown>>
    const allValues = allRaw.map(normalizeProductAttributeValueRecord)

    let candidateProductIds: Set<string> | null = null

    for (const criterion of criteria) {
      const key = slugifyAttributeKey(criterion.attribute_key)
      const def = await this.getAttributeByKey(key)
      const matchingRows = allValues.filter((row) => row.attribute_key === key)

      const matchedForCriterion = new Set<string>()
      for (const row of matchingRows) {
        let passes = true

        if (criterion.eq !== undefined) {
          if (typeof criterion.eq === "boolean") {
            passes = row.value_boolean === criterion.eq
          } else if (typeof criterion.eq === "number") {
            if (criterion.unit && def?.type === "unit") {
              const targetSi = normalizeToSI(
                criterion.eq,
                criterion.unit,
                def.unit_family
              )
              passes =
                row.value_normalized_si !== null &&
                Math.abs((row.value_normalized_si ?? 0) - targetSi) < 1e-6
            } else {
              passes = row.value_number === criterion.eq
            }
          } else {
            const targetStr = String(criterion.eq).toLowerCase()
            if (Array.isArray(row.value_json)) {
              passes = (row.value_json as unknown[]).some(
                (item) => String(item).toLowerCase() === targetStr
              )
            } else {
              passes = (row.value_text ?? "").toLowerCase() === targetStr
            }
          }
        }

        if (passes && criterion.in && criterion.in.length > 0) {
          const allowedSet = new Set(
            criterion.in.map((v) => String(v).toLowerCase())
          )
          if (Array.isArray(row.value_json)) {
            passes = (row.value_json as unknown[]).some((item) =>
              allowedSet.has(String(item).toLowerCase())
            )
          } else {
            passes = allowedSet.has((row.value_text ?? "").toLowerCase())
          }
        }

        if (
          passes &&
          (criterion.min !== undefined || criterion.max !== undefined)
        ) {
          const effectiveNumber =
            row.value_normalized_si !== null
              ? row.value_normalized_si
              : row.value_number
          if (effectiveNumber === null || effectiveNumber === undefined) {
            passes = false
          } else {
            const minBound =
              criterion.min !== undefined
                ? criterion.unit
                  ? normalizeToSI(
                      criterion.min,
                      criterion.unit,
                      def?.unit_family
                    )
                  : criterion.min
                : null
            const maxBound =
              criterion.max !== undefined
                ? criterion.unit
                  ? normalizeToSI(
                      criterion.max,
                      criterion.unit,
                      def?.unit_family
                    )
                  : criterion.max
                : null

            if (minBound !== null && effectiveNumber < minBound - 1e-9) {
              passes = false
            }
            if (maxBound !== null && effectiveNumber > maxBound + 1e-9) {
              passes = false
            }
          }
        }

        if (passes) {
          matchedForCriterion.add(row.product_id)
        }
      }

      if (candidateProductIds === null) {
        candidateProductIds = matchedForCriterion
      } else {
        const currentIds: string[] = Array.from(candidateProductIds)
        candidateProductIds = new Set(
          currentIds.filter((id) => matchedForCriterion.has(id))
        )
      }
    }

    return Array.from(candidateProductIds ?? [])
  }

  // ---------------------------------------------------------------------------
  // 5. Attribute & Content Templates
  // ---------------------------------------------------------------------------

  async getTemplateByIdOrCode(
    idOrCode: string
  ): Promise<AttributeTemplateDTO | null> {
    const trimmed = String(idOrCode ?? "").trim()
    if (!trimmed) {
      return null
    }
    const all = (await this.listAttributeTemplates({})) as unknown as Array<
      Record<string, unknown>
    >
    const match = all
      .map(normalizeAttributeTemplateRecord)
      .find((t) => t.id === trimmed || t.code === trimmed)
    return match ?? null
  }

  async createTemplate(
    input: CreateAttributeTemplateInput
  ): Promise<AttributeTemplateDTO> {
    const name = String(input.name ?? "").trim()
    if (!name) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Template name is required"
      )
    }
    const code = slugifyAttributeKey(input.code || name)
    const existing = await this.getTemplateByIdOrCode(code)
    if (existing) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Template with code "${code}" already exists`
      )
    }

    const contentTree = input.content_tree
      ? validateTreeDocV1(input.content_tree)
      : createEmptyTree("root")

    const created = asRecord(
      await this.createAttributeTemplates({
        code,
        name,
        description: input.description ?? null,
        category_ids: asJsonRecord(input.category_ids ?? []),
        attribute_keys: asJsonRecord(
          (input.attribute_keys ?? []).map(slugifyAttributeKey)
        ),
        content_tree: asJsonRecord(contentTree),
        is_active: input.is_active ?? true,
        metadata: asJsonRecord(input.metadata ?? null),
      })
    )

    return normalizeAttributeTemplateRecord(created)
  }

  async updateTemplate(
    input: UpdateAttributeTemplateInput
  ): Promise<AttributeTemplateDTO> {
    const existing = await this.getTemplateByIdOrCode(input.id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Template "${input.id}" not found`
      )
    }

    const nextTree =
      input.content_tree !== undefined
        ? validateTreeDocV1(input.content_tree)
        : existing.content_tree

    const updated = asRecord(
      await this.updateAttributeTemplates({
        id: existing.id,
        code:
          input.code !== undefined
            ? slugifyAttributeKey(input.code)
            : existing.code,
        name: input.name !== undefined ? input.name.trim() : existing.name,
        description:
          input.description !== undefined
            ? input.description
            : existing.description,
        category_ids: asJsonRecord(
          input.category_ids !== undefined
            ? input.category_ids
            : existing.category_ids
        ),
        attribute_keys: asJsonRecord(
          input.attribute_keys !== undefined
            ? input.attribute_keys.map(slugifyAttributeKey)
            : existing.attribute_keys
        ),
        content_tree: asJsonRecord(nextTree),
        is_active:
          input.is_active !== undefined ? input.is_active : existing.is_active,
        metadata: asJsonRecord(
          input.metadata !== undefined ? input.metadata : existing.metadata
        ),
      })
    )

    return normalizeAttributeTemplateRecord(updated)
  }

  async deleteTemplate(idOrCode: string): Promise<void> {
    const existing = await this.getTemplateByIdOrCode(idOrCode)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Template "${idOrCode}" not found`
      )
    }
    await this.deleteAttributeTemplates([existing.id])
  }

  async listTemplates(filter?: {
    category_id?: string
    is_active?: boolean
  }): Promise<AttributeTemplateDTO[]> {
    const rawList = (await this.listAttributeTemplates({})) as unknown as Array<
      Record<string, unknown>
    >
    let items = rawList.map(normalizeAttributeTemplateRecord)

    if (filter?.is_active !== undefined) {
      items = items.filter((t) => t.is_active === filter.is_active)
    }
    if (filter?.category_id) {
      items = items.filter((t) =>
        t.category_ids.includes(filter.category_id as string)
      )
    }
    return items
  }

  async applyTemplateToProductWithState(
    productId: string,
    templateIdOrCode: string
  ): Promise<{
    extension: ProductExtensionDTO
    wasNew: boolean
    previousState: ProductExtensionDTO | null
  }> {
    const template = await this.getTemplateByIdOrCode(templateIdOrCode)
    if (!template) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Attribute template "${templateIdOrCode}" not found`
      )
    }

    const res = await this.upsertByProductIdWithState({
      product_id: productId,
      template_id: template.id,
      content_tree: template.content_tree,
    })

    return {
      extension: res.record,
      wasNew: res.wasNew,
      previousState: res.previousState,
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Product Feature Badges Catalog
  // ---------------------------------------------------------------------------

  async createFeature(
    input: CreateProductFeatureInput
  ): Promise<ProductFeatureDTO> {
    const title = String(input.title ?? "").trim()
    if (!title) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Feature title is required"
      )
    }
    const code = slugifyAttributeKey(input.code || title)
    const all = (await this.listProductFeatures({})) as unknown as Array<
      Record<string, unknown>
    >
    const dup = all
      .map(normalizeProductFeatureRecord)
      .find((f) => f.code === code)
    if (dup) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Feature badge with code "${code}" already exists`
      )
    }

    const iconUrl = input.icon_url
      ? validateExternalMediaUrl(input.icon_url, {
          allowRelative: true,
          fieldName: "feature.icon_url",
        })
      : null

    const created = asRecord(
      await this.createProductFeatures({
        code,
        title,
        subtitle: input.subtitle ?? null,
        description: input.description ?? null,
        icon_url: iconUrl,
        icon_name: input.icon_name ?? null,
        badge_color: input.badge_color ?? null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true,
        metadata: asJsonRecord(input.metadata ?? null),
      })
    )

    return normalizeProductFeatureRecord(created)
  }

  async updateFeature(
    input: UpdateProductFeatureInput
  ): Promise<ProductFeatureDTO> {
    const all = (await this.listProductFeatures({})) as unknown as Array<
      Record<string, unknown>
    >
    const existing = all
      .map(normalizeProductFeatureRecord)
      .find((f) => f.id === input.id || f.code === input.id)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Feature badge "${input.id}" not found`
      )
    }

    const iconUrl =
      input.icon_url !== undefined
        ? input.icon_url
          ? validateExternalMediaUrl(input.icon_url, {
              allowRelative: true,
              fieldName: "feature.icon_url",
            })
          : null
        : existing.icon_url

    const updated = asRecord(
      await this.updateProductFeatures({
        id: existing.id,
        code:
          input.code !== undefined
            ? slugifyAttributeKey(input.code)
            : existing.code,
        title: input.title !== undefined ? input.title.trim() : existing.title,
        subtitle:
          input.subtitle !== undefined ? input.subtitle : existing.subtitle,
        description:
          input.description !== undefined
            ? input.description
            : existing.description,
        icon_url: iconUrl,
        icon_name:
          input.icon_name !== undefined ? input.icon_name : existing.icon_name,
        badge_color:
          input.badge_color !== undefined
            ? input.badge_color
            : existing.badge_color,
        sort_order:
          input.sort_order !== undefined
            ? input.sort_order
            : existing.sort_order,
        is_active:
          input.is_active !== undefined ? input.is_active : existing.is_active,
        metadata: asJsonRecord(
          input.metadata !== undefined ? input.metadata : existing.metadata
        ),
      })
    )

    return normalizeProductFeatureRecord(updated)
  }

  async deleteFeature(idOrCode: string): Promise<void> {
    const all = (await this.listProductFeatures({})) as unknown as Array<
      Record<string, unknown>
    >
    const existing = all
      .map(normalizeProductFeatureRecord)
      .find((f) => f.id === idOrCode || f.code === idOrCode)
    if (!existing) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Feature badge "${idOrCode}" not found`
      )
    }
    await this.deleteProductFeatures([existing.id])
  }

  async listFeatures(filter?: {
    ids?: string[]
    is_active?: boolean
  }): Promise<ProductFeatureDTO[]> {
    const rawList = (await this.listProductFeatures({})) as unknown as Array<
      Record<string, unknown>
    >
    let items = rawList.map(normalizeProductFeatureRecord)
    if (filter?.is_active !== undefined) {
      items = items.filter((f) => f.is_active === filter.is_active)
    }
    if (filter?.ids && filter.ids.length > 0) {
      const orderMap = new Map(filter.ids.map((id, idx) => [id, idx]))
      items = items
        .filter((f) => orderMap.has(f.id) || orderMap.has(f.code))
        .sort(
          (a, b) =>
            (orderMap.get(a.id) ?? orderMap.get(a.code) ?? 999) -
            (orderMap.get(b.id) ?? orderMap.get(b.code) ?? 999)
        )
      return items
    }
    return items.sort((a, b) => a.sort_order - b.sort_order)
  }

  // ---------------------------------------------------------------------------
  // 7. Image Alt-Text Bulk CSV Import / Export
  // ---------------------------------------------------------------------------

  async exportAllImageAltsCsv(productIds?: string[]): Promise<string> {
    const rawExtensions = (await this.listProductExtensions(
      {}
    )) as unknown as Array<Record<string, unknown>>
    const filterSet =
      productIds && productIds.length > 0 ? new Set(productIds) : null

    const rows: CsvImageAltRow[] = []
    for (const raw of rawExtensions) {
      const ext = normalizeProductExtensionRecord(raw)
      if (filterSet && !filterSet.has(ext.product_id)) {
        continue
      }
      for (const altItem of ext.image_alts) {
        rows.push({
          product_id: ext.product_id,
          image_url: altItem.image_url,
          image_id: altItem.image_id ?? null,
          alt: altItem.alt,
          title: altItem.title ?? null,
          caption: altItem.caption ?? null,
          locale: altItem.locale ?? null,
        })
      }
    }

    return exportImageAltsToCsv(rows)
  }

  async importImageAltsCsvWithState(csvContent: string): Promise<{
    updatedProductIds: string[]
    previousStates: Array<{
      product_id: string
      wasNew: boolean
      previousState: ProductExtensionDTO | null
    }>
  }> {
    const parsedRows = parseImageAltsFromCsv(csvContent)
    const groupedByProduct = new Map<string, CsvImageAltRow[]>()
    for (const row of parsedRows) {
      const list = groupedByProduct.get(row.product_id) ?? []
      list.push(row)
      groupedByProduct.set(row.product_id, list)
    }

    const updatedProductIds: string[] = []
    const previousStates: Array<{
      product_id: string
      wasNew: boolean
      previousState: ProductExtensionDTO | null
    }> = []

    for (const [productId, rows] of groupedByProduct.entries()) {
      const current = await this.getByProductId(productId)
      const mergedAlts = [...(current?.image_alts ?? [])]

      for (const incoming of rows) {
        const idx = mergedAlts.findIndex(
          (a) =>
            a.image_url === incoming.image_url &&
            (a.locale ?? null) === (incoming.locale ?? null)
        )
        const nextEntry: ImageAltMetadata = {
          image_id: incoming.image_id ?? null,
          image_url: incoming.image_url,
          alt: incoming.alt,
          title: incoming.title ?? null,
          caption: incoming.caption ?? null,
          locale: incoming.locale ?? null,
        }
        if (idx >= 0) {
          mergedAlts[idx] = nextEntry
        } else {
          mergedAlts.push(nextEntry)
        }
      }

      const res = await this.upsertByProductIdWithState({
        product_id: productId,
        image_alts: mergedAlts,
      })

      updatedProductIds.push(productId)
      previousStates.push({
        product_id: productId,
        wasNew: res.wasNew,
        previousState: res.previousState,
      })
    }

    return { updatedProductIds, previousStates }
  }

  // ---------------------------------------------------------------------------
  // 8. Multi-Storefront Overrides & Unified Storefront Payload
  // ---------------------------------------------------------------------------

  async resolveStorefrontOverride(
    ext: ProductExtensionDTO | null,
    options?: { sales_channel_id?: string | null; locale?: string | null }
  ): Promise<StorefrontPresentationOverride | null> {
    if (!ext || !ext.storefront_overrides?.length) {
      return null
    }
    const sc = options?.sales_channel_id?.trim() || null
    const loc = options?.locale?.trim() || null
    if (!sc && !loc) {
      return null
    }

    const exactBoth = ext.storefront_overrides.find(
      (o) =>
        sc &&
        loc &&
        o.sales_channel_id === sc &&
        o.locale?.toLowerCase() === loc.toLowerCase()
    )
    if (exactBoth) {
      return exactBoth
    }

    const channelOnly = sc
      ? ext.storefront_overrides.find(
          (o) => o.sales_channel_id === sc && !o.locale
        )
      : null
    if (channelOnly) {
      return channelOnly
    }

    const localeOnly = loc
      ? ext.storefront_overrides.find(
          (o) =>
            !o.sales_channel_id &&
            o.locale?.toLowerCase() === loc.toLowerCase()
        )
      : null
    return localeOnly ?? null
  }

  async getStorefrontProductPayload(params: {
    product_id: string
    variant_ids?: string[]
    sales_channel_id?: string | null
    locale?: string | null
    core_images?: Array<{ id?: string; url: string; rank?: number }>
  }): Promise<StorefrontProductExtensionResponse> {
    const ext = await this.getByProductId(params.product_id)
    const override = await this.resolveStorefrontOverride(ext, {
      sales_channel_id: params.sales_channel_id,
      locale: params.locale,
    })

    // Resolve hierarchical content tree (from product's content_tree or linked template + diff)
    let baseTree: TreeDocV1 | null = ext?.content_tree ?? null
    if (!baseTree && ext?.template_id) {
      const tpl = await this.getTemplateByIdOrCode(ext.template_id)
      baseTree = tpl?.content_tree ?? null
    }
    const resolvedTree = resolveTree(baseTree, ext?.content_diff)

    // Resolve feature badges
    const features =
      ext && ext.feature_ids.length > 0
        ? await this.listFeatures({ ids: ext.feature_ids, is_active: true })
        : []

    // Resolve typed custom attributes
    const attributes = await this.getProductAttributeValues(
      params.product_id,
      params.locale
    )

    // Build unified media gallery
    const effectiveMedia = override?.videos
      ? normalizeVideoList(override.videos)
      : {
          videoUrls: ext?.videos ?? [],
          mediaItems: ext?.media_items ?? [],
        }

    const mediaGallery =
      override?.media_items && override.media_items.length > 0
        ? override.media_items
        : buildUnifiedProductMedia({
            coreImages: params.core_images,
            imageAlts: ext?.image_alts ?? [],
            mediaItems: effectiveMedia.mediaItems,
            models3d: ext?.models_3d ?? [],
            locale: params.locale,
          })

    let variantsMap:
      | Record<string, StorefrontVariantExtensionSummary>
      | undefined
    if (params.variant_ids && params.variant_ids.length > 0) {
      const variantExts = await this.getByVariantIds(params.variant_ids)
      const byId = new Map(variantExts.map((v) => [v.variant_id, v]))
      variantsMap = {}
      for (const vid of params.variant_ids) {
        const matched = byId.get(vid)
        variantsMap[vid] = {
          variant_id: vid,
          thumbnail: matched?.thumbnail ?? null,
          images: matched?.images ?? [],
          videos: matched?.videos ?? [],
          media_items: matched?.media_items ?? [],
          option_signature: matched?.option_signature ?? null,
          swatch_color: matched?.swatch_color ?? null,
          swatch_image_url: matched?.swatch_image_url ?? null,
        }
      }
    }

    return {
      product_id: params.product_id,
      videos: effectiveMedia.videoUrls,
      tagline: override?.tagline ?? ext?.tagline ?? null,
      media_items: effectiveMedia.mediaItems,
      media_gallery: mediaGallery,
      models_3d: ext?.models_3d ?? [],
      attachments: ext?.attachments ?? [],
      image_alts: ext?.image_alts ?? [],
      content_sections: resolvedTree.sections,
      features,
      attributes,
      option_metadata: ext?.option_metadata ?? [],
      seo_metadata: ext?.seo_metadata ?? null,
      resolved_override: override,
      ...(variantsMap ? { variants: variantsMap } : {}),
    }
  }

  // ---------------------------------------------------------------------------
  // 9. Cascade Cleanup on Product Deletion
  // ---------------------------------------------------------------------------

  async purgeProductData(productId: string): Promise<{
    deletedExtension: boolean
    deletedVariantCount: number
    deletedAttributeValuesCount: number
  }> {
    const ext = await this.getByProductId(productId)
    let deletedExtension = false
    if (ext) {
      await this.deleteProductExtensions([ext.id])
      deletedExtension = true
    }

    const variants = await this.listByProductId(productId)
    if (variants.length > 0) {
      await this.deleteVariantExtensions(variants.map((v) => v.id))
    }

    const attrValues = (await this.listProductAttributeValues({
      product_id: productId,
    })) as unknown as Array<Record<string, unknown>>
    if (attrValues.length > 0) {
      await this.deleteProductAttributeValues(
        attrValues.map((a) => String(a.id))
      )
    }

    return {
      deletedExtension,
      deletedVariantCount: variants.length,
      deletedAttributeValuesCount: attrValues.length,
    }
  }
}

export { ProductExtModuleService as ProductExtService }
export default ProductExtModuleService
