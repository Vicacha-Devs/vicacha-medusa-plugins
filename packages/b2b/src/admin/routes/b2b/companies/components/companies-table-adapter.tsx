import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { QueryCompany } from "../../../../../types"
import { useCompanies } from "../../../../hooks/api"
import { CompanyActionsMenu } from "./company-actions-menu"
import "./companies-table-renderers"

export function useCompaniesTableAdapter(): TableAdapter<QueryCompany> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<QueryCompany>({
        entity: "b2b-companies",
        queryPrefix: "comp",
        pageSize: 50,
        useData: (_fields, params) => {
          const { data, isPending, isError, error } = useCompanies({
            ...params,
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
    [t]
  )
}
