import React from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
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

export const config = defineRouteConfig({
  label: "Resoluciones 1876",
})

export const handle = {
  breadcrumb: () => "Resoluciones 1876",
}

export default DianResolutionsPage
