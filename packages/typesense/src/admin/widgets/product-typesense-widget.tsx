import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { SectionRow } from "@medusajs/dashboard/components"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Toaster,
} from "@medusajs/ui"
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
    <>
      <Toaster />
      <Container className="divide-y p-0" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t("widget.title")}</Heading>
          <StatusBadge color={indexed ? "green" : "orange"}>
            {loading
              ? t("widget.checking")
              : indexed
                ? t("widget.indexed")
                : t("widget.notIndexed")}
          </StatusBadge>
        </div>

        {doc && (
          <>
            <SectionRow
              title={t("widget.minMaxPrice")}
              value={`${doc.min_price ?? 0} – ${doc.max_price ?? 0}`}
            />
            <SectionRow
              title={t("widget.inStock")}
              value={
                <div className="flex items-center gap-x-2">
                  <Badge size="xsmall" color={doc.in_stock ? "green" : "grey"}>
                    {doc.in_stock ? t("widget.yes") : t("widget.no")}
                  </Badge>
                  <span>
                    ({t("widget.qty")} {doc.inventory_quantity ?? 0})
                  </span>
                </div>
              }
            />
            <SectionRow
              title={t("widget.skus")}
              value={
                Array.isArray(doc.variant_skus) && doc.variant_skus.length > 0
                  ? doc.variant_skus.join(", ")
                  : t("widget.none")
              }
            />
          </>
        )}

        <div className="flex items-center justify-between gap-x-2 px-6 py-4">
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
          <div className="px-6 py-4">
            <pre className="bg-ui-bg-subtle max-h-60 overflow-auto rounded p-3 font-mono text-xs">
              {JSON.stringify(doc, null, 2)}
            </pre>
          </div>
        )}
      </Container>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductTypesenseWidget
