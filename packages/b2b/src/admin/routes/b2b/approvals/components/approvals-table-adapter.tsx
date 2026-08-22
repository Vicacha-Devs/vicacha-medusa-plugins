import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { AdminCartWithApprovals } from "../../../../../types"
import { useApprovals } from "../../../../hooks/api"
import { ApprovalActions } from "./approval-actions.tsx"
import "./approvals-table-renderers.tsx"

export function useApprovalsTableAdapter(): TableAdapter<AdminCartWithApprovals> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<AdminCartWithApprovals>({
        entity: "b2b-approvals",
        queryPrefix: "apv",
        pageSize: 50,
        useData: (_fields, params) => {
          const { data, isPending, isError, error } = useApprovals({
            ...params,
            order: "-updated_at",
          })
          return {
            data: data?.carts_with_approvals,
            count: data?.count,
            isLoading: isPending,
            isError,
            error,
          }
        },
        renderRowActions: (row) => <ApprovalActions cart={row} />,
        emptyState: {
          empty: {
            heading: t("approvals.table.noRecordsTitle"),
            description: t("approvals.table.noRecordsMessage"),
          },
          filtered: {
            heading: t("approvals.table.noRecordsTitle"),
            description: t("approvals.table.noRecordsMessage"),
          },
        },
      }),
    [t]
  )
}
