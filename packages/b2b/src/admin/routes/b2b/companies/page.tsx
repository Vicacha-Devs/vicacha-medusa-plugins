import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { ConfigurableDataTable, LayoutComposer } from "@medusajs/dashboard/components"
import { Buildings } from "@medusajs/icons"
import { useFeatureFlag } from "@vicacha-devs/medusa-shared-admin/admin"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { CompaniesTable, useCompaniesTableAdapter } from "./components"

const Companies = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isViewConfigEnabled = useFeatureFlag("view_configurations")
  const adapter = useCompaniesTableAdapter()

  return (
    <LayoutComposer
      widgetsZonePrefix="companies_list.list"
      preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
      sections={{
        main: (
          <LayoutComposer.Entry id="CompaniesListTable">
            {isViewConfigEnabled ? (
              <ConfigurableDataTable
                adapter={adapter}
                heading={t("companies.title")}
                subHeading={t("overview.nav.companies.description")}
                actions={[{ label: t("actions.create"), to: "create" }]}
              />
            ) : (
              <CompaniesTable onCreateClick={() => navigate("create")} />
            )}
          </LayoutComposer.Entry>
        ),
      }}
    />
  )
}

const Breadcrumb = () => {
  const { t } = useTranslation()
  return t("companies.title")
}

export const config = defineRouteConfig({
  label: "companies.title",
  translationNs: "b2b",
  icon: Buildings,
})

export const handle = {
  breadcrumb: () => <Breadcrumb />,
}

export default Companies
