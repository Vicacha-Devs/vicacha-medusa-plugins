import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { CheckCircle } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { DeliveryLogsTab } from "../../../components/mpn/delivery-logs-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnLogsPage: React.FC = () => {
  const { logs } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.logs"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnLogsSection">
            <DeliveryLogsTab logs={logs} />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("logs.title")
}

export const config = defineRouteConfig({
  label: "Delivery Logs",
  translationNs: "mpn",
  icon: CheckCircle,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnLogsPage
