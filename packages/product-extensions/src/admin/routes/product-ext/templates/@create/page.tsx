import * as React from "react"
import { RouteDrawer, useRouteModal } from "@medusajs/dashboard/components"
import { Heading, Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { TemplateCreateForm } from "../../../../components"
import {
  type TemplateFormState,
  useProductExtStudio,
} from "../../../../hooks/use-product-ext-studio"

const CreateTemplateContent = () => {
  const { handleSuccess } = useRouteModal()
  const studio = useProductExtStudio()

  const handleSubmit = async (values: TemplateFormState) => {
    const ok = await studio.handleCreateTemplate(values)
    if (ok) {
      handleSuccess()
    }
  }

  return <TemplateCreateForm onSubmit={handleSubmit} loading={studio.isBusy} />
}

const TemplateCreateModalPage = () => {
  const { t } = useTranslation()

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <Heading>{t("templatesTab.createTitle")}</Heading>
      </RouteDrawer.Header>
      <CreateTemplateContent />
      <Toaster />
    </RouteDrawer>
  )
}

export default TemplateCreateModalPage
