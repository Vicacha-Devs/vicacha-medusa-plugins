import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type AttributeDefinitionDTO,
  type AttributeTemplateDTO,
  type BulkAssignVariantMediaByOptionInput,
  type CreateAttributeDefinitionInput,
  type CreateAttributeTemplateInput,
  type CreateProductFeatureInput,
  PRODUCT_EXT_MODULE,
  type ProductAttributeValueDTO,
  type ProductExtensionDTO,
  type ProductExtModuleService,
  type ProductFeatureDTO,
  type ResolvedProductAttributeEntry,
  type UpdateAttributeDefinitionInput,
  type UpdateAttributeTemplateInput,
  type UpdateProductFeatureInput,
  type UpsertProductAttributeValueInput,
  type UpsertProductExtensionInput,
  type UpsertProductExtInput,
  type UpsertVariantExtensionInput,
  type UpsertVariantExtInput,
  type VariantExtensionDTO,
} from "../modules/product-ext"

export type {
  UpsertProductExtInput,
  UpsertProductExtensionInput,
  UpsertVariantExtInput,
  UpsertVariantExtensionInput,
}


export interface UpsertProductExtCompensateInput {
  product_id: string
  wasNew: boolean
  previousState: ProductExtensionDTO | null
}

export const upsertProductExtStep = createStep(
  "upsert-product-ext",
  async (input: UpsertProductExtensionInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { record, wasNew, previousState } =
      await service.upsertByProductIdWithState(input)

    return new StepResponse<
      ProductExtensionDTO,
      UpsertProductExtCompensateInput
    >(record, {
      product_id: input.product_id,
      wasNew,
      previousState,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    if (compensateData.wasNew) {
      await service.deleteByProductId(compensateData.product_id)
      return
    }
    if (compensateData.previousState) {
      await service.upsertByProductId({
        product_id: compensateData.previousState.product_id,
        videos: compensateData.previousState.videos,
        tagline: compensateData.previousState.tagline,
        media_items: compensateData.previousState.media_items,
        models_3d: compensateData.previousState.models_3d,
        attachments: compensateData.previousState.attachments,
        image_alts: compensateData.previousState.image_alts,
        content_tree: compensateData.previousState.content_tree,
        content_diff: compensateData.previousState.content_diff,
        template_id: compensateData.previousState.template_id,
        feature_ids: compensateData.previousState.feature_ids,
        option_metadata: compensateData.previousState.option_metadata,
        storefront_overrides:
          compensateData.previousState.storefront_overrides,
        seo_metadata: compensateData.previousState.seo_metadata,
        metadata: compensateData.previousState.metadata,
      })
    }
  }
)

export const upsertProductExtWorkflow = createWorkflow(
  "upsert-product-ext",
  (input: UpsertProductExtensionInput) => {
    const result = upsertProductExtStep(input)
    return new WorkflowResponse(result)
  }
)

export interface UpsertVariantExtCompensateInput {
  variant_id: string
  wasNew: boolean
  previousState: VariantExtensionDTO | null
}

export const upsertVariantExtStep = createStep(
  "upsert-variant-ext",
  async (input: UpsertVariantExtensionInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { record, wasNew, previousState } =
      await service.upsertByVariantIdWithState(input)

    return new StepResponse<
      VariantExtensionDTO,
      UpsertVariantExtCompensateInput
    >(record, {
      variant_id: input.variant_id,
      wasNew,
      previousState,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    if (compensateData.wasNew) {
      await service.deleteByVariantId(compensateData.variant_id)
      return
    }
    if (compensateData.previousState) {
      await service.upsertByVariantId({
        variant_id: compensateData.previousState.variant_id,
        product_id: compensateData.previousState.product_id,
        thumbnail: compensateData.previousState.thumbnail,
        images: compensateData.previousState.images,
        videos: compensateData.previousState.videos,
        media_items: compensateData.previousState.media_items,
        option_signature: compensateData.previousState.option_signature,
        swatch_color: compensateData.previousState.swatch_color,
        swatch_image_url: compensateData.previousState.swatch_image_url,
        metadata: compensateData.previousState.metadata,
      })
    }
  }
)

export const upsertVariantExtWorkflow = createWorkflow(
  "upsert-variant-ext",
  (input: UpsertVariantExtensionInput) => {
    const result = upsertVariantExtStep(input)
    return new WorkflowResponse(result)
  }
)

export interface BulkAssignVariantMediaCompensateInput {
  states: Array<{
    variant_id: string
    wasNew: boolean
    previousState: VariantExtensionDTO | null
  }>
}

export const bulkAssignVariantMediaByOptionStep = createStep(
  "bulk-assign-variant-media-by-option",
  async (input: BulkAssignVariantMediaByOptionInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { updated, states } =
      await service.bulkAssignVariantMediaByOption(input)

    return new StepResponse<
      VariantExtensionDTO[],
      BulkAssignVariantMediaCompensateInput
    >(updated, { states })
  },
  async (compensateData, { container }) => {
    if (!compensateData?.states?.length) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    for (const item of compensateData.states) {
      if (item.wasNew) {
        await service.deleteByVariantId(item.variant_id)
      } else if (item.previousState) {
        await service.upsertByVariantId({
          variant_id: item.previousState.variant_id,
          product_id: item.previousState.product_id,
          thumbnail: item.previousState.thumbnail,
          images: item.previousState.images,
          videos: item.previousState.videos,
          media_items: item.previousState.media_items,
          option_signature: item.previousState.option_signature,
          swatch_color: item.previousState.swatch_color,
          swatch_image_url: item.previousState.swatch_image_url,
          metadata: item.previousState.metadata,
        })
      }
    }
  }
)

export const bulkAssignVariantMediaByOptionWorkflow = createWorkflow(
  "bulk-assign-variant-media-by-option",
  (input: BulkAssignVariantMediaByOptionInput) => {
    const result = bulkAssignVariantMediaByOptionStep(input)
    return new WorkflowResponse(result)
  }
)

export interface ApplyAttributeTemplateInput {
  product_id: string
  template_id_or_code: string
}

export const applyAttributeTemplateStep = createStep(
  "apply-attribute-template",
  async (input: ApplyAttributeTemplateInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { extension, wasNew, previousState } =
      await service.applyTemplateToProductWithState(
        input.product_id,
        input.template_id_or_code
      )

    return new StepResponse<
      ProductExtensionDTO,
      UpsertProductExtCompensateInput
    >(extension, {
      product_id: input.product_id,
      wasNew,
      previousState,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    if (compensateData.wasNew) {
      await service.deleteByProductId(compensateData.product_id)
      return
    }
    if (compensateData.previousState) {
      await service.upsertByProductId({
        product_id: compensateData.previousState.product_id,
        template_id: compensateData.previousState.template_id,
        content_tree: compensateData.previousState.content_tree,
        content_diff: compensateData.previousState.content_diff,
      })
    }
  }
)

export const applyAttributeTemplateWorkflow = createWorkflow(
  "apply-attribute-template",
  (input: ApplyAttributeTemplateInput) => {
    const result = applyAttributeTemplateStep(input)
    return new WorkflowResponse(result)
  }
)

export interface SetProductAttributesInput {
  product_id: string
  attributes: UpsertProductAttributeValueInput[]
}

export interface SetProductAttributesCompensateInput {
  product_id: string
  previousValues: ProductAttributeValueDTO[]
}

export const setProductAttributesStep = createStep(
  "set-product-attributes",
  async (input: SetProductAttributesInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { values, previousValues } =
      await service.setProductAttributesWithState(
        input.product_id,
        input.attributes
      )

    return new StepResponse<
      ResolvedProductAttributeEntry[],
      SetProductAttributesCompensateInput
    >(values, {
      product_id: input.product_id,
      previousValues,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.rollbackProductAttributeValues(
      compensateData.product_id,
      compensateData.previousValues
    )
  }
)

export const setProductAttributesWorkflow = createWorkflow(
  "set-product-attributes",
  (input: SetProductAttributesInput) => {
    const result = setProductAttributesStep(input)
    return new WorkflowResponse(result)
  }
)

export interface ImportImageAltsInput {
  csv_content: string
}

export interface ImportImageAltsCompensateInput {
  previousStates: Array<{
    product_id: string
    wasNew: boolean
    previousState: ProductExtensionDTO | null
  }>
}

export const importImageAltsStep = createStep(
  "import-image-alts",
  async (input: ImportImageAltsInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const { updatedProductIds, previousStates } =
      await service.importImageAltsCsvWithState(input.csv_content)

    return new StepResponse<
      { updated_product_ids: string[] },
      ImportImageAltsCompensateInput
    >({ updated_product_ids: updatedProductIds }, { previousStates })
  },
  async (compensateData, { container }) => {
    if (!compensateData?.previousStates?.length) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    for (const st of compensateData.previousStates) {
      if (st.wasNew) {
        await service.deleteByProductId(st.product_id)
      } else if (st.previousState) {
        await service.upsertByProductId({
          product_id: st.previousState.product_id,
          image_alts: st.previousState.image_alts,
        })
      }
    }
  }
)

export const importImageAltsWorkflow = createWorkflow(
  "import-image-alts",
  (input: ImportImageAltsInput) => {
    const result = importImageAltsStep(input)
    return new WorkflowResponse(result)
  }
)

// ---------------------------------------------------------------------------
// Catalog Management Workflows (Attributes, Templates, Features)
// ---------------------------------------------------------------------------

export const createAttributeStep = createStep(
  "create-attribute",
  async (input: CreateAttributeDefinitionInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const created = await service.createAttribute(input)
    return new StepResponse<AttributeDefinitionDTO, { id: string }>(created, {
      id: created.id,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData?.id) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.deleteAttribute(compensateData.id)
  }
)

export const createAttributeWorkflow = createWorkflow(
  "create-attribute",
  (input: CreateAttributeDefinitionInput) => {
    const result = createAttributeStep(input)
    return new WorkflowResponse(result)
  }
)

export const updateAttributeStep = createStep(
  "update-attribute",
  async (input: UpdateAttributeDefinitionInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const all = await service.listAttributes()
    const previous = all.find((a) => a.id === input.id) ?? null
    const updated = await service.updateAttribute(input)
    return new StepResponse<
      AttributeDefinitionDTO,
      AttributeDefinitionDTO | null
    >(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.updateAttribute({
      id: previous.id,
      label: previous.label,
      description: previous.description,
      type: previous.type,
      unit_family: previous.unit_family,
      default_unit: previous.default_unit,
      allowed_units: previous.allowed_units,
      options: previous.options,
      validation_rules: previous.validation_rules,
      is_filterable: previous.is_filterable,
      is_required: previous.is_required,
      is_global: previous.is_global,
      category_ids: previous.category_ids,
      sort_order: previous.sort_order,
      metadata: previous.metadata,
    })
  }
)

export const updateAttributeWorkflow = createWorkflow(
  "update-attribute",
  (input: UpdateAttributeDefinitionInput) => {
    const result = updateAttributeStep(input)
    return new WorkflowResponse(result)
  }
)

export const deleteAttributeStep = createStep(
  "delete-attribute",
  async (input: { id: string }, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const all = await service.listAttributes()
    const previous =
      all.find((a) => a.id === input.id || a.key === input.id) ?? null
    await service.deleteAttribute(input.id)
    return new StepResponse<
      { id: string; deleted: boolean },
      AttributeDefinitionDTO | null
    >({ id: input.id, deleted: true }, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.createAttribute({
      key: previous.key,
      label: previous.label,
      description: previous.description,
      type: previous.type,
      unit_family: previous.unit_family,
      default_unit: previous.default_unit,
      allowed_units: previous.allowed_units,
      options: previous.options,
      validation_rules: previous.validation_rules,
      is_filterable: previous.is_filterable,
      is_required: previous.is_required,
      is_global: previous.is_global,
      category_ids: previous.category_ids,
      sort_order: previous.sort_order,
      metadata: previous.metadata,
    })
  }
)

export const deleteAttributeWorkflow = createWorkflow(
  "delete-attribute",
  (input: { id: string }) => {
    const result = deleteAttributeStep(input)
    return new WorkflowResponse(result)
  }
)

export const createTemplateStep = createStep(
  "create-template",
  async (input: CreateAttributeTemplateInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const created = await service.createTemplate(input)
    return new StepResponse<AttributeTemplateDTO, { id: string }>(created, {
      id: created.id,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData?.id) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.deleteTemplate(compensateData.id)
  }
)

export const createTemplateWorkflow = createWorkflow(
  "create-template",
  (input: CreateAttributeTemplateInput) => {
    const result = createTemplateStep(input)
    return new WorkflowResponse(result)
  }
)

export const updateTemplateStep = createStep(
  "update-template",
  async (input: UpdateAttributeTemplateInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const previous = await service.getTemplateByIdOrCode(input.id)
    const updated = await service.updateTemplate(input)
    return new StepResponse<
      AttributeTemplateDTO,
      AttributeTemplateDTO | null
    >(updated, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.updateTemplate({
      id: previous.id,
      code: previous.code,
      name: previous.name,
      description: previous.description,
      category_ids: previous.category_ids,
      attribute_keys: previous.attribute_keys,
      content_tree: previous.content_tree,
      is_active: previous.is_active,
      metadata: previous.metadata,
    })
  }
)

export const updateTemplateWorkflow = createWorkflow(
  "update-template",
  (input: UpdateAttributeTemplateInput) => {
    const result = updateTemplateStep(input)
    return new WorkflowResponse(result)
  }
)

export const deleteTemplateStep = createStep(
  "delete-template",
  async (input: { id: string }, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const previous = await service.getTemplateByIdOrCode(input.id)
    await service.deleteTemplate(input.id)
    return new StepResponse<
      { id: string; deleted: boolean },
      AttributeTemplateDTO | null
    >({ id: input.id, deleted: true }, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.createTemplate({
      code: previous.code,
      name: previous.name,
      description: previous.description,
      category_ids: previous.category_ids,
      attribute_keys: previous.attribute_keys,
      content_tree: previous.content_tree,
      is_active: previous.is_active,
      metadata: previous.metadata,
    })
  }
)

export const deleteTemplateWorkflow = createWorkflow(
  "delete-template",
  (input: { id: string }) => {
    const result = deleteTemplateStep(input)
    return new WorkflowResponse(result)
  }
)

export const createFeatureStep = createStep(
  "create-feature",
  async (input: CreateProductFeatureInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const created = await service.createFeature(input)
    return new StepResponse<ProductFeatureDTO, { id: string }>(created, {
      id: created.id,
    })
  },
  async (compensateData, { container }) => {
    if (!compensateData?.id) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.deleteFeature(compensateData.id)
  }
)

export const createFeatureWorkflow = createWorkflow(
  "create-feature",
  (input: CreateProductFeatureInput) => {
    const result = createFeatureStep(input)
    return new WorkflowResponse(result)
  }
)

export const updateFeatureStep = createStep(
  "update-feature",
  async (input: UpdateProductFeatureInput, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const all = await service.listFeatures()
    const previous =
      all.find((f) => f.id === input.id || f.code === input.id) ?? null
    const updated = await service.updateFeature(input)
    return new StepResponse<ProductFeatureDTO, ProductFeatureDTO | null>(
      updated,
      previous
    )
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.updateFeature({
      id: previous.id,
      code: previous.code,
      title: previous.title,
      subtitle: previous.subtitle,
      description: previous.description,
      icon_url: previous.icon_url,
      icon_name: previous.icon_name,
      badge_color: previous.badge_color,
      sort_order: previous.sort_order,
      is_active: previous.is_active,
      metadata: previous.metadata,
    })
  }
)

export const updateFeatureWorkflow = createWorkflow(
  "update-feature",
  (input: UpdateProductFeatureInput) => {
    const result = updateFeatureStep(input)
    return new WorkflowResponse(result)
  }
)

export const deleteFeatureStep = createStep(
  "delete-feature",
  async (input: { id: string }, { container }) => {
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    const all = await service.listFeatures()
    const previous =
      all.find((f) => f.id === input.id || f.code === input.id) ?? null
    await service.deleteFeature(input.id)
    return new StepResponse<
      { id: string; deleted: boolean },
      ProductFeatureDTO | null
    >({ id: input.id, deleted: true }, previous)
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }
    const service = container.resolve<ProductExtModuleService>(
      PRODUCT_EXT_MODULE
    )
    await service.createFeature({
      code: previous.code,
      title: previous.title,
      subtitle: previous.subtitle,
      description: previous.description,
      icon_url: previous.icon_url,
      icon_name: previous.icon_name,
      badge_color: previous.badge_color,
      sort_order: previous.sort_order,
      is_active: previous.is_active,
      metadata: previous.metadata,
    })
  }
)

export const deleteFeatureWorkflow = createWorkflow(
  "delete-feature",
  (input: { id: string }) => {
    const result = deleteFeatureStep(input)
    return new WorkflowResponse(result)
  }
)
