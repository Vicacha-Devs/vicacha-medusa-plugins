import * as React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { AttributeDefinitionsTab } from "../../../components"
import { useProductExtStudio } from "../../../hooks/use-product-ext-studio"

const AttributesRoutePage = () => {
  const navigate = useNavigate()
  const studio = useProductExtStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="product_ext.attributes"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="ProductExtAttributesSection">
            <AttributeDefinitionsTab
              form={studio.attributeForm}
              onFormChange={studio.setAttributeForm}
              attributes={studio.attributes}
              isBusy={studio.isBusy}
              onCreate={() => void studio.handleCreateAttribute()}
              onDelete={(id) => void studio.handleDeleteAttribute(id)}
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
  return t("attributesTab.createTitle")
}

export const config = defineRouteConfig({
  label: "attributesTab.createTitle",
  translationNs: "product-ext",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default AttributesRoutePage
