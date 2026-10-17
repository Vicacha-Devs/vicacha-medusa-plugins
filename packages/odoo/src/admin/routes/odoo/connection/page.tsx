import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import {
  ConnectionSecuritySideSection,
  ConnectionTab,
} from "../../../components"
import { useOdooDashboard } from "../../../hooks/use-odoo-dashboard"

const OdooConnectionPage = () => {
  const { i18n } = useTranslation()
  const isRtl = (i18n.resolvedLanguage || i18n.language || "").startsWith("ar")

  const {
    configQuery,
    connectionForm,
    setConnectionForm,
    verifyConnectionMutation,
    saveConfigMutation,
    handleVerifyConnection,
    handleSaveConnection,
  } = useOdooDashboard()

  return (
    <LayoutComposer
      widgetsZonePrefix="odoo.connection"
      preferredLayoutId={CORE_LAYOUT_IDS.TWO_COLUMN}
      dir={isRtl ? "rtl" : "ltr"}
      sections={{
        main: (
          <LayoutComposer.Entry id="OdooConnectionFormSection">
            <ConnectionTab
              form={connectionForm}
              onFormChange={setConnectionForm}
              savedFlags={configQuery.data?.config}
              isVerifying={verifyConnectionMutation.isPending}
              isSaving={saveConfigMutation.isPending}
              onVerify={() => void handleVerifyConnection()}
              onSave={() => void handleSaveConnection()}
            />
          </LayoutComposer.Entry>
        ),
        side: (
          <LayoutComposer.Entry id="OdooConnectionSecuritySection">
            <ConnectionSecuritySideSection
              protocol={connectionForm.protocol}
              allowPrivateNetwork={connectionForm.allowPrivateNetwork}
              savedFlags={configQuery.data?.config}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.connection")
}

export const config = defineRouteConfig({
  label: "tabs.connection",
  translationNs: "odoo",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default OdooConnectionPage
