import * as React from "react"
import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import { Heading, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { AttributeCreateForm } from "../../../../components"
import {
  type AttributeFormState,
  useProductExtStudio,
} from "../../../../hooks/use-product-ext-studio"

const CreateAttributeContent = () => {
  const { handleSuccess } = useRouteModal()
  const studio = useProductExtStudio()

  const handleSubmit = async (values: AttributeFormState) => {
    const ok = await studio.handleCreateAttribute(values)
    if (ok) {
      handleSuccess()
    }
  }

  return <AttributeCreateForm onSubmit={handleSubmit} loading={studio.isBusy} />
}

const AttributeCreateModalPage = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("attributesTab.createTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateAttributeContent />
      <Toaster />
    </RouteDrawer>
  )
}

export default AttributeCreateModalPage
