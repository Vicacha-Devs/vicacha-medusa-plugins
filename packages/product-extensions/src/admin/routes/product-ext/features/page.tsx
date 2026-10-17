import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { CheckCircle } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { FeatureBadgesTab } from "../../../components"
import { useProductExtStudio } from "../../../hooks/use-product-ext-studio"

const FeaturesRoutePage = () => {
  const navigate = useNavigate()
  const studio = useProductExtStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="product_ext.features"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ProductExtFeaturesSection">
            <FeatureBadgesTab
              form={studio.featureForm}
              onFormChange={studio.setFeatureForm}
              features={studio.features}
              isBusy={studio.isBusy}
              onCreate={() => void studio.handleCreateFeature()}
              onDelete={(id) => void studio.handleDeleteFeature(id)}
              onOpenCreateDrawer={() => navigate("create")}
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
  return t("featuresTab.createTitle")
}

export const config = defineRouteConfig({
  label: "featuresTab.createTitle",
  translationNs: "product-ext",
  icon: CheckCircle,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default FeaturesRoutePage
