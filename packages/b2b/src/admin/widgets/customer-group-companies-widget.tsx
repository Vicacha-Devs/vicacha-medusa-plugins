import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ConfigurableDataTable } from "@medusajs/dashboard/components"
import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"

import { QueryCompany } from "../../types"
import { useCompanies } from "../hooks/api"
import { CompanyActionsMenu } from "../routes/b2b/companies/components/company-actions-menu"
import "../routes/b2b/companies/components/companies-table-renderers"

function useCustomerGroupCompaniesAdapter(customerGroupId: string): TableAdapter<QueryCompany> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<QueryCompany>({
        entity: "b2b-companies",
        queryPrefix: "cgcomp",
        pageSize: 10,
        useData: (_fields, params) => {
          const { data, isPending, isError, error } = useCompanies({
            ...params,
            customer_group_id: customerGroupId,
          })
          return {
            data: data?.companies,
            count: data?.count,
            isLoading: isPending,
            isError,
            error,
          }
        },
        getRowHref: (row) => `/b2b/companies/${row.id}`,
        renderRowActions: (row) => <CompanyActionsMenu company={row} />,
        emptyState: {
          empty: {
            heading: t("companies.table.noRecordsTitle"),
            description: t("companies.table.noRecordsMessage"),
          },
          filtered: {
            heading: t("companies.table.noRecordsTitle"),
            description: t("companies.table.noRecordsMessage"),
          },
        },
      }),
    [customerGroupId, t]
  )
}

const CustomerGroupCompaniesWidget = () => {
  const { id } = useParams()
  const { t } = useTranslation()
  const adapter = useCustomerGroupCompaniesAdapter(id!)

  return (
    <ConfigurableDataTable
      adapter={adapter}
      heading={t("companies.title")}
    />
  )
}

export const config = defineWidgetConfig({
  zone: "customer_group.details",
})

export default CustomerGroupCompaniesWidget
