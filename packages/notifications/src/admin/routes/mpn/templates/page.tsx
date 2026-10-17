import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { DocumentText } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { TemplatesBuilderTab } from "../../../components/mpn/templates-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnTemplatesPage: React.FC = () => {
  const {
    templates,
    loadAllStudioData,
    setStatusBanner,
  } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.templates"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnTemplatesSection">
            <TemplatesBuilderTab
              templates={templates}
              onRefresh={loadAllStudioData}
              onStatus={setStatusBanner}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("templates.title")
}

export const config = defineRouteConfig({
  label: "Templates",
  translationNs: "mpn",
  icon: DocumentText,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnTemplatesPage
