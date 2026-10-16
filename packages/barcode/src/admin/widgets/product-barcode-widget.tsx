import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { useTranslation } from "react-i18next"
import { ProductBarcodeCard } from "../components"
import {
  type ProductBarcodeWidgetEntity,
  useProductBarcodes,
} from "../hooks/use-product-barcodes"

interface ProductBarcodeWidgetProps {
  data?: ProductBarcodeWidgetEntity
}

const ProductBarcodeWidget = ({ data }: ProductBarcodeWidgetProps) => {
  const { t } = useTranslation()
  const {
    tags,
    linkedBarcodes,
    printPreview,
    isBusy,
    feedback,
    handleGenerateProductBarcodes,
    handleQuickPrintProductLabels,
  } = useProductBarcodes(data)

  return (
    <ProductBarcodeCard
      productTitle={data?.title || t("widget.defaultProductTitle")}
      tags={tags}
      linkedBarcodes={linkedBarcodes}
      printPreview={printPreview}
      isBusy={isBusy}
      feedback={feedback}
      onGenerateBarcodes={() => void handleGenerateProductBarcodes()}
      onQuickPrintLabels={() => void handleQuickPrintProductLabels()}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductBarcodeWidget
