import React, { useCallback, useEffect, useState } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { dianClient } from "../../../../sdk"
import { DianFiscalProfilesSection } from "../../../components"

const DianFiscalProfilesPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Array<Record<string, any>>>([])

  const refresh = useCallback(async () => {
    try {
      const res = await dianClient.listFiscalProfiles()
      setProfiles(res.fiscal_profiles || [])
    } catch {
      setProfiles([])
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <LayoutComposer
      widgetsZonePrefix="dian.fiscal_profiles"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="DianFiscalProfilesSection">
            <DianFiscalProfilesSection
              profiles={profiles}
              onRefresh={() => void refresh()}
            />
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

export const config = defineRouteConfig({
  label: "Perfiles Fiscales / B2B",
})

export const handle = {
  breadcrumb: () => "Perfiles Fiscales / B2B",
}

export default DianFiscalProfilesPage
