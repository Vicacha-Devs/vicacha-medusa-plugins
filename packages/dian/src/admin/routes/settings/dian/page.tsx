import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { useDianConfig } from "../../../../hooks"
import {
  DianSettingsEmisorSection,
  DianSettingsSoftwareSection,
  DianSettingsTaxAutomationSection,
} from "../../../components"

const DianSettingsPage: React.FC = () => {
  const { config, municipalities, refresh } = useDianConfig()

  return (
    <LayoutComposer
      widgetsZonePrefix="dian.settings"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <>
            <LayoutComposer.Entry id="DianSettingsEmisorSection">
              <DianSettingsEmisorSection
                config={config}
                municipalities={municipalities}
                onSaved={() => void refresh()}
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="DianSettingsSoftwareSection">
              <DianSettingsSoftwareSection
                config={config}
                onSaved={() => void refresh()}
              />
            </LayoutComposer.Entry>
            <LayoutComposer.Entry id="DianSettingsTaxAutomationSection">
              <DianSettingsTaxAutomationSection
                config={config}
                onSaved={() => void refresh()}
              />
            </LayoutComposer.Entry>
          </>
        ),
      }}
    />
  )
}

export const config = defineRouteConfig({
  label: "DIAN Colombia",
})

export const handle = {
  breadcrumb: () => "Configuración DIAN",
}

export default DianSettingsPage
