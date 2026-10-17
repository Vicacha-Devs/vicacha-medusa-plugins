import { useCallback, useEffect, useState } from "react"
import type {
  AttributeFilterCriterion,
  StorefrontProductExtensionResponse,
  UnifiedMediaEntry,
} from "../modules/product-ext/types"
import type { ProductExtSdk } from "../sdk"

export function useStoreProductExtension(
  sdk: ProductExtSdk,
  params: {
    product_id: string
    variant_ids?: string[]
    sales_channel_id?: string | null
    locale?: string | null
  }
) {
  const [data, setData] = useState<StorefrontProductExtensionResponse | null>(
    null
  )
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const variantKey = (params.variant_ids ?? []).join(",")

  const refresh = useCallback(async () => {
    if (!params.product_id) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await sdk.store.getProductExtension({
        product_id: params.product_id,
        variant_ids: params.variant_ids,
        sales_channel_id: params.sales_channel_id,
        locale: params.locale,
      })
      setData(response)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load product extension"
      )
    } finally {
      setIsLoading(false)
    }
  }, [
    sdk,
    params.product_id,
    variantKey,
    params.sales_channel_id,
    params.locale,
  ])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    data,
    isLoading,
    error,
    refresh,
  }
}

export function useVariantResolvedGallery(
  payload: StorefrontProductExtensionResponse | null,
  selectedVariantId?: string | null
): UnifiedMediaEntry[] {
  if (!payload) {
    return []
  }

  if (selectedVariantId && payload.variants?.[selectedVariantId]) {
    const variantExt = payload.variants[selectedVariantId]
    const entries: UnifiedMediaEntry[] = []

    if (variantExt.thumbnail) {
      entries.push({
        id: `var_thumb_${selectedVariantId}`,
        kind: "image",
        url: variantExt.thumbnail,
        thumbnail_url: variantExt.thumbnail,
        alt: null,
        title: null,
        position: 0,
      })
    }

    for (let idx = 0; idx < variantExt.images.length; idx++) {
      const img = variantExt.images[idx]
      entries.push({
        id: img.id ?? `var_img_${idx + 1}`,
        kind: "image",
        url: img.url,
        thumbnail_url: img.url,
        alt: img.alt ?? null,
        title: null,
        position: (img.position ?? idx + 1) * 10,
      })
    }

    for (let idx = 0; idx < variantExt.media_items.length; idx++) {
      const vid = variantExt.media_items[idx]
      entries.push({
        id: vid.id || `var_vid_${idx + 1}`,
        kind: "video",
        url: vid.url,
        thumbnail_url: vid.poster_url ?? null,
        alt: vid.alt ?? vid.title ?? null,
        title: vid.title ?? null,
        position: vid.position ?? (idx + 1) * 10 + 5,
        provider: vid.provider,
        embed_url: vid.embed_url ?? null,
        captions_url: vid.captions_url ?? null,
        mime_type: vid.mime_type ?? null,
      })
    }

    if (entries.length > 0) {
      return entries.sort((a, b) => a.position - b.position)
    }
  }

  return payload.media_gallery ?? []
}

export function useProductAttributeFilter(
  sdk: ProductExtSdk,
  initialCriteria: AttributeFilterCriterion[] = []
) {
  const [criteria, setCriteria] =
    useState<AttributeFilterCriterion[]>(initialCriteria)
  const [productIds, setProductIds] = useState<string[]>([])
  const [isFiltering, setIsFiltering] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const applyFilter = useCallback(
    async (nextCriteria?: AttributeFilterCriterion[]) => {
      const active = nextCriteria ?? criteria
      if (nextCriteria) {
        setCriteria(nextCriteria)
      }
      if (active.length === 0) {
        setProductIds([])
        return []
      }
      setIsFiltering(true)
      setError(null)
      try {
        const res = await sdk.store.filterProductsByAttributes(active)
        setProductIds(res.product_ids)
        return res.product_ids
      } catch (err) {
        setError(err instanceof Error ? err.message : "Attribute filter failed")
        return []
      } finally {
        setIsFiltering(false)
      }
    },
    [sdk, criteria]
  )

  return {
    criteria,
    setCriteria,
    productIds,
    isFiltering,
    error,
    applyFilter,
  }
}
