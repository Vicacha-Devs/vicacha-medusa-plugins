import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { QueryCompany } from "../../../../../types"
import { useAdminCustomerGroups, useCompanies } from "../../../../hooks/api"
import { CompanyActionsMenu } from "./company-actions-menu.tsx"
import "./companies-table-renderers.tsx"

export function useCompaniesTableAdapter(): TableAdapter<QueryCompany> {
  const { t } = useTranslation()
  const { data: customerGroups } = useAdminCustomerGroups()

  return useMemo(
    () =>
      createTableAdapter<QueryCompany>({
        entity: "b2b-companies",
        queryPrefix: "comp",
        pageSize: 50,
        useData: (_fields, params) => {
          const { data, isPending, isError, error } = useCompanies({
            ...params,
            fields:
              "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
            order: "-created_at",
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
        renderRowActions: (row) => (
          <CompanyActionsMenu company={row} customerGroups={customerGroups} />
        ),
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
    [t, customerGroups]
  )
}
