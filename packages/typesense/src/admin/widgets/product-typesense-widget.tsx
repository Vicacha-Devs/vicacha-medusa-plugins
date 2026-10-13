import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"

import { useProductTypesenseWidgetState } from "../../hooks"

type ProductWidgetProps = {
  data?: {
    id?: string
    title?: string
  }
}

const ProductTypesenseWidget: React.FC<ProductWidgetProps> = ({ data }) => {
  const { t, i18n } = useTranslation()
  const productId = data?.id
  const {
    indexed,
    doc,
    loading,
    syncing,
    showJson,
    setShowJson,
    handleSyncProduct,
  } = useProductTypesenseWidgetState({
    productId,
  })

  if (!productId) {
    return null
  }

  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  return (
    <Container
      className="flex flex-col gap-y-3 px-6 py-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center justify-between">
        <Heading level="h2">{t("widget.title")}</Heading>
        <Badge color={indexed ? "green" : "orange"} size="small">
          {loading
            ? t("widget.checking")
            : indexed
              ? t("widget.indexed")
              : t("widget.notIndexed")}
        </Badge>
      </div>

      {doc && (
        <div className="text-ui-fg-subtle flex flex-col gap-y-1 text-xs">
          <div>
            <strong>{t("widget.minMaxPrice")}</strong> {doc.min_price ?? 0} –{" "}
            {doc.max_price ?? 0}
          </div>
          <div>
            <strong>{t("widget.inStock")}</strong>{" "}
            {doc.in_stock ? t("widget.yes") : t("widget.no")} (
            {t("widget.qty")} {doc.inventory_quantity ?? 0})
          </div>
          <div>
            <strong>{t("widget.skus")}</strong>{" "}
            {Array.isArray(doc.variant_skus) && doc.variant_skus.length > 0
              ? doc.variant_skus.join(", ")
              : t("widget.none")}
          </div>
        </div>
      )}

      <div className="flex items-center gap-x-2">
        <Button
          variant="secondary"
          size="small"
          onClick={() => void handleSyncProduct()}
          isLoading={syncing}
        >
          {t("widget.syncButton")}
        </Button>
        {doc && (
          <Button
            variant="transparent"
            size="small"
            onClick={() => setShowJson((prev) => !prev)}
          >
            {showJson ? t("widget.hideJson") : t("widget.viewJson")}
          </Button>
        )}
      </div>

      {showJson && doc && (
        <pre className="bg-ui-bg-subtle max-h-60 overflow-auto rounded p-2 font-mono text-xs">
          {JSON.stringify(doc, null, 2)}
        </pre>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductTypesenseWidget
