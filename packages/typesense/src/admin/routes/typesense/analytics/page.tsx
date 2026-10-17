import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { LayoutComposer } from "@medusajs/dashboard/components"
import { Sparkles } from "@medusajs/icons"
import { Toaster } from "@medusajs/ui"
import React from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { AnalyticsTab } from "../../../components/typesense/analytics-tab"
import { useTypesenseStudio } from "../../../components/typesense/use-typesense-studio"

const TypesenseAnalyticsPage: React.FC = () => {
  const navigate = useNavigate()
  const studio = useTypesenseStudio()

  return (
    <>
      <Toaster />
      <LayoutComposer
        widgetsZonePrefix="typesense.analytics"
        preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
        sections={{
          main: (
            <LayoutComposer.Entry id="TypesenseAnalyticsMainSection">
              <AnalyticsTab
                analytics={studio.analytics}
                onAddSynonymForQuery={(query) => {
                  studio.prefillSynonymFromNoHitQuery(query)
                  navigate(
                    `/typesense/merchandising?synonym=${encodeURIComponent(query)}`
                  )
                }}
              />
            </LayoutComposer.Entry>
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
  translationNs: "typesense",
  icon: Sparkles,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default TypesenseAnalyticsPage
