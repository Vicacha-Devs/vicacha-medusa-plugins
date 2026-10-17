import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { ProductSocialSummary } from "../components/index.js"
import { useProductSocialStatus } from "../hooks/use-product-social-status.js"

export interface ProductWidgetProps {
  data?: {
    id?: string
    title?: string
  }
}

/**
 * Medusa Admin Product Detail Widget (`product.details.after`) entrypoint.
 * Data fetching is decoupled into `useProductSocialStatus` and UI rendering into `ProductSocialSummary`.
 */
const ProductSocialWidget = ({ data }: ProductWidgetProps) => {
  const { t } = useTranslation()
  const { taggedPosts, catalogStatus, loading, errorMessage } =
    useProductSocialStatus(data?.id)

  const widgetTitle = data?.title
    ? `${t("widget.title")} — ${data.title}`
    : t("widget.title")

  return (
    <>
      <Toaster />
      <ProductSocialSummary
        title={widgetTitle}
        taggedPosts={taggedPosts}
        catalogStatus={catalogStatus}
        loading={loading}
        errorMessage={errorMessage}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSocialWidget

