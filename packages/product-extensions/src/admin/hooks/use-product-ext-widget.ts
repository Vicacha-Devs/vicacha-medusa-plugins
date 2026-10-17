import { useCallback, useEffect, useState } from "react"
import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type {
  AttributeDefinitionDTO,
  ProductExtensionDTO,
  ResolvedProductAttributeEntry,
} from "../../modules/product-ext/types"
import { createProductExtSdk } from "../../sdk"

const sdk = createProductExtSdk()

export interface ProductWidgetEntity {
  id?: string
  title?: string
}

export interface CategoryWidgetEntity {
  id?: string
  name?: string
}

export function useProductExtWidget(product?: ProductWidgetEntity) {
  const { t } = useTranslation()
  const productId = product?.id ?? ""
  const [extension, setExtension] = useState<ProductExtensionDTO | null>(null)
  const [attributes, setAttributes] = useState<ResolvedProductAttributeEntry[]>(
    []
  )
  const [taglineInput, setTaglineInput] = useState<string>("")
  const [videosCsvInput, setVideosCsvInput] = useState<string>("")
  const [glbUrlInput, setGlbUrlInput] = useState<string>("")
  const [isBusy, setIsBusy] = useState<boolean>(false)

  const loadProductData = useCallback(async () => {
    if (!productId) {
      return
    }
    setIsBusy(true)
    try {
      const [ext, attrRes] = await Promise.all([
        sdk.admin.getProductExtension(productId),
        sdk.admin.getProductAttributes(productId),
      ])
      setExtension(ext)
      setAttributes(attrRes.attributes ?? [])
      setTaglineInput(ext.tagline ?? "")
      setVideosCsvInput((ext.videos ?? []).join(", "))
      setGlbUrlInput(ext.models_3d?.[0]?.glb_url ?? "")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.loadProductExtError")
      )
    } finally {
      setIsBusy(false)
    }
  }, [productId, t])

  useEffect(() => {
    void loadProductData()
  }, [loadProductData])

  const handleSaveExtension = useCallback(async () => {
    if (!productId) {
      return
    }
    setIsBusy(true)
    try {
      const videos = videosCsvInput
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)

      const models3d = glbUrlInput.trim()
        ? [
            {
              id: "model3d_primary",
              glb_url: glbUrlInput.trim(),
              title: `${product?.title ?? "Product"} 3D Model`,
            },
          ]
        : []

      const updated = await sdk.admin.upsertProductExtension(productId, {
        tagline: taglineInput.trim() || null,
        videos,
        models_3d: models3d,
      })
      setExtension(updated)
      toast.success(t("messages.saveProductExtSuccess"))
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.saveProductExtError")
      )
    } finally {
      setIsBusy(false)
    }
  }, [productId, product?.title, taglineInput, videosCsvInput, glbUrlInput, t])

  return {
    extension,
    attributes,
    taglineInput,
    setTaglineInput,
    videosCsvInput,
    setVideosCsvInput,
    glbUrlInput,
    setGlbUrlInput,
    isBusy,
    handleSaveExtension,
  }
}

export function useCategoryAttributesWidget(category?: CategoryWidgetEntity) {
  const { t } = useTranslation()
  const categoryId = category?.id ?? ""
  const [attributes, setAttributes] = useState<AttributeDefinitionDTO[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const loadCategoryAttributes = useCallback(async () => {
    if (!categoryId) {
      return
    }
    setIsLoading(true)
    try {
      const res = await sdk.admin.listAttributes({ category_id: categoryId })
      setAttributes(res.attributes ?? [])
    } catch (err) {
      setAttributes([])
      toast.error(
        err instanceof Error ? err.message : t("messages.loadStudioError")
      )
    } finally {
      setIsLoading(false)
    }
  }, [categoryId, t])

  useEffect(() => {
    void loadCategoryAttributes()
  }, [loadCategoryAttributes])

  return {
    attributes,
    isLoading,
    refresh: () => void loadCategoryAttributes(),
  }
}
