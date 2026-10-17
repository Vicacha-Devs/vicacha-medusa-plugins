import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  AttributeDefinitionDTO,
  AttributeTemplateDTO,
  AttributeValueType,
  ProductFeatureDTO,
  TreeDocV1,
  UnitCode,
  UnitFamily,
} from "../../modules/product-ext/types"
import { createProductExtSdk } from "../../sdk"

const sdk = createProductExtSdk()

export interface AttributeFormState {
  key: string
  label: string
  description: string
  type: AttributeValueType
  unit_family: UnitFamily | ""
  default_unit: UnitCode | ""
  options_csv: string
  category_ids_csv: string
  is_filterable: boolean
  is_required: boolean
  is_global: boolean
}

export interface TemplateFormState {
  code: string
  name: string
  description: string
  category_ids_csv: string
  attribute_keys_csv: string
  section_title: string
  item_title: string
  item_markdown: string
}

export interface FeatureFormState {
  code: string
  title: string
  subtitle: string
  icon_url: string
  badge_color: string
}

export interface BulkMediaFormState {
  product_id: string
  option_title: string
  option_value: string
  variant_id_sample: string
  thumbnail: string
  images_csv: string
  videos_csv: string
  swatch_color: string
}

export const INITIAL_ATTRIBUTE_FORM: AttributeFormState = {
  key: "",
  label: "",
  description: "",
  type: "text",
  unit_family: "",
  default_unit: "",
  options_csv: "",
  category_ids_csv: "",
  is_filterable: true,
  is_required: false,
  is_global: true,
}

export const INITIAL_TEMPLATE_FORM: TemplateFormState = {
  code: "",
  name: "",
  description: "",
  category_ids_csv: "",
  attribute_keys_csv: "",
  section_title: "Specifications & Care",
  item_title: "Overview",
  item_markdown: "Detailed product specification block.",
}

export const INITIAL_FEATURE_FORM: FeatureFormState = {
  code: "",
  title: "",
  subtitle: "",
  icon_url: "",
  badge_color: "blue",
}

export const INITIAL_BULK_MEDIA_FORM: BulkMediaFormState = {
  product_id: "",
  option_title: "Color",
  option_value: "Navy",
  variant_id_sample: "",
  thumbnail: "",
  images_csv: "",
  videos_csv: "",
  swatch_color: "#1B365D",
}

export function useProductExtStudio() {
  const { t } = useTranslation()
  const [attributes, setAttributes] = useState<AttributeDefinitionDTO[]>([])
  const [templates, setTemplates] = useState<AttributeTemplateDTO[]>([])
  const [features, setFeatures] = useState<ProductFeatureDTO[]>([])
  const [csvContent, setCsvContent] = useState<string>(
    "product_id,image_url,image_id,alt,title,caption,locale\n"
  )
  const [isBusy, setIsBusy] = useState<boolean>(false)

  const [attributeForm, setAttributeForm] = useState<AttributeFormState>(
    INITIAL_ATTRIBUTE_FORM
  )
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(
    INITIAL_TEMPLATE_FORM
  )
  const [featureForm, setFeatureForm] = useState<FeatureFormState>(
    INITIAL_FEATURE_FORM
  )
  const [bulkMediaForm, setBulkMediaForm] = useState<BulkMediaFormState>(
    INITIAL_BULK_MEDIA_FORM
  )

  const loadAll = useCallback(async () => {
    setIsBusy(true)
    try {
      const [attrRes, tplRes, featRes] = await Promise.all([
        sdk.admin.listAttributes(),
        sdk.admin.listTemplates(),
        sdk.admin.listFeatures(),
      ])
      setAttributes(attrRes.attributes ?? [])
      setTemplates(tplRes.templates ?? [])
      setFeatures(featRes.features ?? [])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.loadStudioError")
      )
    } finally {
      setIsBusy(false)
    }
  }, [t])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const handleCreateAttribute = useCallback(
    async (override?: Partial<AttributeFormState>): Promise<boolean> => {
      const payload = { ...attributeForm, ...override }
      if (!payload.label.trim()) {
        toast.error(t("messages.attributeLabelRequired"))
        return false
      }
      setIsBusy(true)
      try {
        const options = payload.options_csv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((val, idx) => ({
            value: val,
            label: val,
            sort_order: idx,
          }))

        const categoryIds = payload.category_ids_csv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

        await sdk.admin.createAttribute({
          key: payload.key.trim() || undefined,
          label: payload.label.trim(),
          description: payload.description.trim() || null,
          type: payload.type,
          unit_family: payload.unit_family || null,
          default_unit: payload.default_unit || null,
          options: options.length > 0 ? options : null,
          category_ids: categoryIds,
          is_filterable: payload.is_filterable,
          is_required: payload.is_required,
          is_global: payload.is_global,
        })

        toast.success(
          t("messages.attributeCreated", { label: payload.label })
        )
        setAttributeForm(INITIAL_ATTRIBUTE_FORM)
        await loadAll()
        return true
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("messages.attributeCreateError")
        )
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [attributeForm, loadAll, t]
  )

  const handleDeleteAttribute = useCallback(
    async (id: string) => {
      setIsBusy(true)
      try {
        await sdk.admin.deleteAttribute(id)
        toast.success(t("messages.attributeDeleted"))
        await loadAll()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : t("messages.attributeDeleteError")
        )
      } finally {
        setIsBusy(false)
      }
    },
    [loadAll, t]
  )

  const handleCreateTemplate = useCallback(
    async (override?: Partial<TemplateFormState>): Promise<boolean> => {
      const payload = { ...templateForm, ...override }
      if (!payload.name.trim()) {
        toast.error(t("messages.templateNameRequired"))
        return false
      }
      setIsBusy(true)
      try {
        const contentTree: TreeDocV1 = {
          schema: "tree@1",
          root_id: "root",
          nodes: {
            root: {
              id: "root",
              parent_id: null,
              type: "root",
              order: 0,
            },
            sec_main: {
              id: "sec_main",
              parent_id: "root",
              type: "section",
              title: payload.section_title.trim() || "Details",
              order: 0,
            },
            item_main: {
              id: "item_main",
              parent_id: "sec_main",
              type: "item",
              title: payload.item_title.trim() || "Overview",
              order: 0,
              blocks: [
                {
                  type: "markdown",
                  text: payload.item_markdown.trim() || "Product details.",
                },
              ],
            },
          },
        }

        await sdk.admin.createTemplate({
          code: payload.code.trim() || undefined,
          name: payload.name.trim(),
          description: payload.description.trim() || null,
          category_ids: payload.category_ids_csv
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          attribute_keys: payload.attribute_keys_csv
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          content_tree: contentTree,
        })

        toast.success(t("messages.templateCreated", { name: payload.name }))
        setTemplateForm(INITIAL_TEMPLATE_FORM)
        await loadAll()
        return true
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("messages.templateCreateError")
        )
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [templateForm, loadAll, t]
  )

  const handleDeleteTemplate = useCallback(
    async (id: string) => {
      setIsBusy(true)
      try {
        await sdk.admin.deleteTemplate(id)
        toast.success(t("messages.templateDeleted"))
        await loadAll()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("messages.templateDeleteError")
        )
      } finally {
        setIsBusy(false)
      }
    },
    [loadAll, t]
  )

  const handleCreateFeature = useCallback(
    async (override?: Partial<FeatureFormState>): Promise<boolean> => {
      const payload = { ...featureForm, ...override }
      if (!payload.title.trim()) {
        toast.error(t("messages.featureTitleRequired"))
        return false
      }
      setIsBusy(true)
      try {
        await sdk.admin.createFeature({
          code: payload.code.trim() || undefined,
          title: payload.title.trim(),
          subtitle: payload.subtitle.trim() || null,
          icon_url: payload.icon_url.trim() || null,
          badge_color: payload.badge_color.trim() || "blue",
        })
        toast.success(t("messages.featureCreated", { title: payload.title }))
        setFeatureForm(INITIAL_FEATURE_FORM)
        await loadAll()
        return true
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("messages.featureCreateError")
        )
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [featureForm, loadAll, t]
  )

  const handleDeleteFeature = useCallback(
    async (id: string) => {
      setIsBusy(true)
      try {
        await sdk.admin.deleteFeature(id)
        toast.success(t("messages.featureDeleted"))
        await loadAll()
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("messages.featureDeleteError")
        )
      } finally {
        setIsBusy(false)
      }
    },
    [loadAll, t]
  )

  const handleBulkAssignVariantMedia = useCallback(
    async (override?: Partial<BulkMediaFormState>): Promise<boolean> => {
      const payload = { ...bulkMediaForm, ...override }
      if (
        !payload.product_id.trim() ||
        !payload.option_title.trim() ||
        !payload.option_value.trim()
      ) {
        toast.error(t("messages.bulkMediaRequired"))
        return false
      }
      setIsBusy(true)
      try {
        const variantIds = payload.variant_id_sample
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)

        const res = await sdk.admin.bulkAssignVariantMediaByOption(
          payload.product_id.trim(),
          {
            option_title: payload.option_title.trim(),
            option_value: payload.option_value.trim(),
            variants: variantIds.map((vid) => ({
              variant_id: vid,
              options: {
                [payload.option_title.trim()]: payload.option_value.trim(),
              },
            })),
            thumbnail: payload.thumbnail.trim() || null,
            images: payload.images_csv
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            videos: payload.videos_csv
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            swatch_color: payload.swatch_color.trim() || null,
          }
        )
        toast.success(
          t("messages.bulkMediaAssigned", {
            count: res.updated_variants.length,
          })
        )
        return true
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : t("messages.bulkMediaError")
        )
        return false
      } finally {
        setIsBusy(false)
      }
    },
    [bulkMediaForm, t]
  )

  const handleExportCsv = useCallback(async () => {
    setIsBusy(true)
    try {
      const res = await sdk.admin.exportImageAltsCsv()
      setCsvContent(res.csv_content)
      toast.success(t("messages.csvExported"))
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.csvExportError")
      )
    } finally {
      setIsBusy(false)
    }
  }, [t])

  const handleImportCsv = useCallback(async () => {
    setIsBusy(true)
    try {
      const res = await sdk.admin.importImageAltsCsv(csvContent)
      toast.success(
        t("messages.csvImported", {
          count: res.updated_product_ids.length,
        })
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.csvImportError")
      )
    } finally {
      setIsBusy(false)
    }
  }, [csvContent, t])

  return {
    attributes,
    templates,
    features,
    csvContent,
    setCsvContent,
    isBusy,
    attributeForm,
    setAttributeForm,
    templateForm,
    setTemplateForm,
    featureForm,
    setFeatureForm,
    bulkMediaForm,
    setBulkMediaForm,
    onRefresh: () => void loadAll(),
    handleCreateAttribute,
    handleDeleteAttribute,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleCreateFeature,
    handleDeleteFeature,
    handleBulkAssignVariantMedia,
    handleExportCsv,
    handleImportCsv,
  }
}
