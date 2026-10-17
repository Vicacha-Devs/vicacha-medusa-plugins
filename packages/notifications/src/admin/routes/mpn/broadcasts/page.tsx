import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Megaphone } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { BroadcastsConsentTab } from "../../../components/mpn/broadcasts-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnBroadcastsPage: React.FC = () => {
  const {
    broadcasts,
    consentSummary,
    templates,
    loadAllStudioData,
    setStatusBanner,
  } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.broadcasts"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnBroadcastsMainSection">
            <BroadcastsConsentTab
              broadcasts={broadcasts}
              consentSummary={consentSummary}
              templates={templates}
              onRefresh={loadAllStudioData}
              onStatus={setStatusBanner}
              section="main"
            />
          </LayoutComposer.Entry>
        ),
        side: (
          <LayoutComposer.Entry id="MpnBroadcastsSideSection">
            <BroadcastsConsentTab
              broadcasts={broadcasts}
              consentSummary={consentSummary}
              templates={templates}
              onRefresh={loadAllStudioData}
              onStatus={setStatusBanner}
              section="side"
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.broadcasts")
}

export const config = defineRouteConfig({
  label: "Broadcasts",
  translationNs: "mpn",
  icon: Megaphone,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnBroadcastsPage
