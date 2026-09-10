import { ConfigurableDataTable } from "@medusajs/dashboard/components"
import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { QueryEmployee } from "../../../../../../types"
import { useEmployees } from "../../../../../hooks/api"
import { EmployeesActionsMenu } from "../@employee/components"
import "./company-employees-table-renderers"

function useCompanyEmployeesAdapter(companyId: string): TableAdapter<QueryEmployee> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<QueryEmployee>({
        entity: "b2b-company-employees",
        queryPrefix: "cemp",
        pageSize: 20,
        useData: (_fields, params) => {
          const { data, isPending, isError, error } = useEmployees(companyId, params)
          return {
            data: data?.employees,
            count: data?.count,
            isLoading: isPending,
            isError,
            error,
          }
        },
        getRowHref: (row) => {
          const customerId = (row as any).original?.customer?.id
          
          return customerId ? `/customers/${customerId}` : undefined
        },
        renderRowActions: (row) => (
          <EmployeesActionsMenu employee={row} />
        ),
        emptyState: {
          empty: { heading: t("employees.noRecords"), description: "" },
          filtered: { heading: t("employees.noRecords"), description: "" },
        },
      }),
    [companyId, t]
  )
}

export const CompanyEmployeesSection = ({ companyId }: { companyId: string }) => {
  const { t } = useTranslation()
  const adapter = useCompanyEmployeesAdapter(companyId)

  return (
    <ConfigurableDataTable
      adapter={adapter}
      heading={t("employees.title")}
      actions={[{ label: t("actions.add"), to: `/b2b/companies/${companyId}/employee/create` }]}
    />
  )
}
