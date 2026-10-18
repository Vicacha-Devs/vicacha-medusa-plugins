import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { useTranslation } from "react-i18next"
import { useDianResolutions } from "../../../../hooks"
import { DianResolutionsSection } from "../../../components"

const DianResolutionsPage: React.FC = () => {
  const { resolutions, loading, refresh } = useDianResolutions()

  return (
    <LayoutComposer
      widgetsZonePrefix="dian.resolutions"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="DianResolutionsSection">
            <DianResolutionsSection
              resolutions={resolutions}
              loading={loading}
              onRefresh={() => void refresh()}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("dian.nav.resolutions")
}

export const config = defineRouteConfig({
  label: "dian.nav.resolutions",
  translationNs: "dian",
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default DianResolutionsPage
