import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { CogSixTooth } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { ChannelsConfigTab } from "../../../components/mpn/channels-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnChannelsPage: React.FC = () => {
  const {
    channelsConfig,
    loadAllStudioData,
    setStatusBanner,
  } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.channels"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnChannelsMainSection">
            <ChannelsConfigTab
              channelsConfig={channelsConfig}
              onRefresh={loadAllStudioData}
              onStatus={setStatusBanner}
              section="main"
            />
          </LayoutComposer.Entry>
        ),
        side: (
          <LayoutComposer.Entry id="MpnChannelsSideSection">
            <ChannelsConfigTab
              channelsConfig={channelsConfig}
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
  return t("tabs.channels")
}

export const config = defineRouteConfig({
  label: "Channels",
  translationNs: "mpn",
  icon: CogSixTooth,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnChannelsPage
