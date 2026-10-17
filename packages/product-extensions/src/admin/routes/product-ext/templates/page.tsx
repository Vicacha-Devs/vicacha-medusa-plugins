import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { TemplatesBuilderTab } from "../../../components"
import { useProductExtStudio } from "../../../hooks/use-product-ext-studio"

const TemplatesRoutePage = () => {
  const navigate = useNavigate()
  const studio = useProductExtStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="product_ext.templates"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ProductExtTemplatesSection">
            <TemplatesBuilderTab
              form={studio.templateForm}
              onFormChange={studio.setTemplateForm}
              templates={studio.templates}
              isBusy={studio.isBusy}
              onCreate={() => void studio.handleCreateTemplate()}
              onDelete={(id) => void studio.handleDeleteTemplate(id)}
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
  return t("templatesTab.createTitle")
}

export const config = defineRouteConfig({
  label: "templatesTab.createTitle",
  translationNs: "product-ext",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TemplatesRoutePage
