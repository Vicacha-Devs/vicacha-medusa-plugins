import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { EnvelopeSolid } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"
import { DummySandboxTab } from "../../../components/mpn/sandbox-tab"
import { useNotificationStudio } from "../../../components/mpn/use-notification-studio"

const MpnSandboxPage: React.FC = () => {
  const { sandboxMessages, loadAllStudioData } = useNotificationStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="mpn.sandbox"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="MpnSandboxSection">
            <DummySandboxTab
              sandboxMessages={sandboxMessages}
              onRefresh={loadAllStudioData}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("sandbox.title")
}

export const config = defineRouteConfig({
  label: "OTP Sandbox",
  translationNs: "mpn",
  icon: EnvelopeSolid,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default MpnSandboxPage
