import * as React from "react"
import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import { Heading, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { FeatureCreateForm } from "../../../../components"
import {
  type FeatureFormState,
  useProductExtStudio,
} from "../../../../hooks/use-product-ext-studio"

const CreateFeatureContent = () => {
  const { handleSuccess } = useRouteModal()
  const studio = useProductExtStudio()

  const handleSubmit = async (values: FeatureFormState) => {
    const ok = await studio.handleCreateFeature(values)
    if (ok) {
      handleSuccess()
    }
  }

  return <FeatureCreateForm onSubmit={handleSubmit} loading={studio.isBusy} />
}

const FeatureCreateModalPage = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("featuresTab.createTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateFeatureContent />
      <Toaster />
    </RouteDrawer>
  )
}

export default FeatureCreateModalPage
