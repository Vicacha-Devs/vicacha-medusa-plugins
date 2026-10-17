import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Swatch } from "@medusajs/icons"
import React from "react"
import { useTranslation } from "react-i18next"

import { TypesenseHeaderBar } from "../../../components/typesense/header-bar"
import { OverviewTab } from "../../../components/typesense/overview-tab"
import { useTypesenseStudio } from "../../../components/typesense/use-typesense-studio"

const TypesenseCollectionsPage: React.FC = () => {
  const studio = useTypesenseStudio()

  return (
    <LayoutComposer
      widgetsZonePrefix="typesense.collections"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <div className="flex flex-col gap-y-4" dir={studio.isRtl ? "rtl" : "ltr"}>
            <LayoutComposer.Entry id="TypesenseCollectionsHeader">
              <TypesenseHeaderBar
                healthy={studio.healthy}
                nodeInfo={studio.nodeInfo}
                loading={studio.loading}
                syncingAll={studio.syncingEntity === "all"}
                onRefresh={() => void studio.fetchOverview()}
                onRebuildAll={() => void studio.handleSyncEntity()}
              />
            </LayoutComposer.Entry>

            <LayoutComposer.Entry id="TypesenseCollectionsTable">
              <OverviewTab
                collections={studio.collections}
                syncJobs={studio.syncJobs}
                syncingEntity={studio.syncingEntity}
                onSyncEntity={(entity) => void studio.handleSyncEntity(entity)}
                onDeleteCustomEntity={(entity) =>
                  void studio.handleDeleteCustomEntity(entity)
                }
              />
            </LayoutComposer.Entry>
          </div>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.overview")
}

export const config = defineRouteConfig({
  label: "tabs.overview",
  translationNs: "typesense",
  icon: Swatch,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesenseCollectionsPage
