import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"

import { QueryQuote } from "../../../../../types"
import { useQuotes } from "../../../../hooks/api"
import "./quotes-table-renderers.tsx"

export function useQuotesTableAdapter(): TableAdapter<QueryQuote> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<QueryQuote>({
        entity: "b2b-quotes",
        queryPrefix: "quo",
        pageSize: 50,
        useData: (_fields, params) => {
          const { quotes, count, isPending, isError, error } = useQuotes({
            ...params,
            fields:
              "+draft_order.total,+draft_order.customer.email,*draft_order.customer.employee.company",
            order: "-created_at",
          })
          return {
            data: quotes,
            count,
            isLoading: isPending,
            isError,
            error,
          }
        },
        getRowHref: (row) => `/b2b/quotes/${row.id}`,
        emptyState: {
          empty: {
            heading: t("quotes.table.noRecordsTitle"),
            description: t("quotes.table.noRecordsMessage"),
          },
          filtered: {
            heading: t("quotes.table.noRecordsTitle"),
            description: t("quotes.table.noRecordsMessage"),
          },
        },
      }),
    [t]
  )
}
