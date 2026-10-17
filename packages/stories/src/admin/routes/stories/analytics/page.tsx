import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { CheckCircle } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  AnalyticsFunnelSection,
  AnalyticsRingBreakdownSection,
  AnalyticsTopSlidesSection,
} from "../../../components/analytics-tab"
import { useStoriesStudio } from "../../../hooks/use-stories-studio"

const StoriesAnalyticsPage = () => {
  const studio = useStoriesStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="stories.analytics"
        preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
        sections={{
          main: (
            <div className="flex flex-col gap-y-4">
              <LayoutComposer.Entry id="AnalyticsFunnelSection">
                <AnalyticsFunnelSection analytics={studio.analytics} />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="AnalyticsRingBreakdownSection">
                <AnalyticsRingBreakdownSection analytics={studio.analytics} />
              </LayoutComposer.Entry>
              <LayoutComposer.Entry id="AnalyticsTopSlidesSection">
                <AnalyticsTopSlidesSection analytics={studio.analytics} />
              </LayoutComposer.Entry>
            </div>
          ),
        }}
      />
    </>
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("tabs.analytics")
}

export const config = defineRouteConfig({
  label: "tabs.analytics",
  translationNs: "stories",
  icon: CheckCircle,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default StoriesAnalyticsPage
