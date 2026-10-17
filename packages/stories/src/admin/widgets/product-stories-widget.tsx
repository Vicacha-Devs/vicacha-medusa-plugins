import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useTranslation } from "react-i18next"
import { ProductStoriesCard } from "../components"
import {
  type ProductWidgetEntity,
  useProductStories,
} from "../hooks/use-product-stories"

interface ProductWidgetProps {
  data?: ProductWidgetEntity
}

const ProductStoriesWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()
  const {
    taggedSlides,
    isCreating,
    handleQuickCreateProductStory,
  } = useProductStories(data)

  return (
    <ProductStoriesCard
      productTitle={data?.title || t("widget.thisProductFallback")}
      taggedSlides={taggedSlides}
      isCreating={isCreating}
      onQuickCreateProductStory={handleQuickCreateProductStory}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductStoriesWidget
