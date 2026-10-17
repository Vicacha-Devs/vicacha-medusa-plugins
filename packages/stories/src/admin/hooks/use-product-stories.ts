import { toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useAdminStoriesState, useCreateStorySlide } from "../../hooks"

export interface ProductWidgetEntity {
  id?: string
  title?: string
  handle?: string
  thumbnail?: string | null
}

/**
 * Decoupled hook for the Product Details Shoppable Stories widget (`product.details.after`).
 */
export const useProductStories = (product?: ProductWidgetEntity) => {
  const { t } = useTranslation()
  const productId = product?.id ?? ""
  const stateQuery = useAdminStoriesState(
    productId ? { product_id: productId } : undefined,
    { enabled: Boolean(productId) }
  )
  const createSlideMutation = useCreateStorySlide()

  const taggedSlides = stateQuery.data?.stories ?? []
  const groups = stateQuery.data?.groups ?? []

  const handleQuickCreateProductStory = async () => {
    if (!productId || !product?.title) return
    const mediaUrl =
      product.thumbnail || "https://images.unsplash.com/photo-1523275335684-37898b6baf30"

    try {
      const res = await createSlideMutation.mutateAsync({
        group_id: groups[0]?.id ?? null,
        title: product.title,
        caption: t("widget.featuredCaption", { title: product.title }),
        media_type: "image",
        media_url: mediaUrl,
        thumbnail_url: product.thumbnail ?? null,
        link_url: product.handle ? `/products/${product.handle}` : null,
        link_text: t("widget.shopProductLink"),
        hotspots: [
          {
            product_id: productId,
            product_title: product.title,
            product_handle: product.handle ?? null,
            product_thumbnail: product.thumbnail ?? null,
            x_percent: 50,
            y_percent: 65,
            label: product.title,
          },
        ],
      })
      toast.success(
        t("messages.productStoryCreated", { title: res.story.title })
      )
      void stateQuery.refetch()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("messages.slideCreateError")
      )
    }
  }

  return {
    taggedSlides,
    isCreating: createSlideMutation.isPending,
    handleQuickCreateProductStory,
  }
}
