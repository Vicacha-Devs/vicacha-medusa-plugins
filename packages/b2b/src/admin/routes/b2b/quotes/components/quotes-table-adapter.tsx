import { createTableAdapter, TableAdapter } from "@medusajs/dashboard/lib"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { QueryQuote } from "../../../../../types"
import { useQuotes } from "../../../../hooks/api"
import { QuoteActionsMenu } from "./quote-actions-menu"
import "./quotes-table-renderers"

export function useQuotesTableAdapter(): TableAdapter<QueryQuote> {
  const { t } = useTranslation()

  return useMemo(
    () =>
      createTableAdapter<QueryQuote>({
        entity: "b2b-quotes",
        queryPrefix: "quot",
        pageSize: 50,
        useData: (_fields, params) => {
          const result = useQuotes({ ...params, order: "-created_at" })
          return {
            data: result.quotes,
            count: result.count,
            isLoading: result.isPending,
            isError: result.isError,
            error: result.error,
          }
        },
        getRowHref: (row) => `/b2b/quotes/${row.id}`,
        renderRowActions: (row) => <QuoteActionsMenu quote={row} />,
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
