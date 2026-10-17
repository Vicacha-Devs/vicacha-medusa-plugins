import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { MediaPlay } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { VariantBulkMediaSection } from "../../../components"
import { useProductExtStudio } from "../../../hooks/use-product-ext-studio"

const VariantMediaRoutePage = () => {
  const studio = useProductExtStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="product_ext.variant_media"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ProductExtVariantMediaSection">
            <VariantBulkMediaSection
              form={studio.bulkMediaForm}
              onFormChange={studio.setBulkMediaForm}
              isBusy={studio.isBusy}
              onBulkAssign={() => void studio.handleBulkAssignVariantMedia()}
            />
            <Toaster />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.variantMedia")
}

export const config = defineRouteConfig({
  label: "tabs.variantMedia",
  translationNs: "product-ext",
  icon: MediaPlay,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default VariantMediaRoutePage
