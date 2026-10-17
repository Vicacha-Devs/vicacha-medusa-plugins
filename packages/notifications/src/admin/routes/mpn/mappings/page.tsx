import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Tag } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { EventMappingsTab } from "../../../components/mpn/event-mappings-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnMappingsPage: React.FC = () => {
  const {
    mappings,
    supportedEvents,
    templates,
    loadAllStudioData,
    setStatusBanner,
  } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.mappings"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnMappingsSection">
            <EventMappingsTab
              mappings={mappings}
              supportedEvents={supportedEvents}
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
  return t("mappings.title")
}

export const config = defineRouteConfig({
  label: "Event Mappings",
  translationNs: "mpn",
  icon: Tag,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnMappingsPage
