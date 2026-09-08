import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { DateCell } from "@vicacha-devs/medusa-shared-admin/admin"
import { QueryQuote } from "../../../../../../types"
import QuoteStatusBadge from "../quote-status-badge"

const columnHelper = createColumnHelper<QueryQuote>()

export const useQuotesTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("status", {
        header: t("fields.status"),
        cell: ({ getValue }) => <QuoteStatusBadge status={getValue()} />,
      }),
      columnHelper.accessor("customer" as any, {
        header: t("quotes.table.customer"),
        cell: ({ row }) => {
          const customer = (row.original as any).customer
          if (!customer) return <span className="txt-compact-small text-ui-fg-subtle">—</span>
          const name =
            [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
            customer.email ||
            customer.id
          return (
            <Link
              to={`/customers/${customer.id}`}
              className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            >
              {name}
            </Link>
          )
        },
      }),
      columnHelper.accessor("draft_order" as any, {
        header: t("quotes.table.draftOrder"),
        cell: ({ row }) => {
          const draftOrder = (row.original as any).draft_order
          if (!draftOrder) return <span className="txt-compact-small text-ui-fg-subtle">—</span>
          return (
            <Link
              to={`/orders/${draftOrder.id}`}
              className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
            >
              #{draftOrder.display_id}
            </Link>
          )
        },
      }),
      columnHelper.accessor("messages_count" as any, {
        header: t("quotes.table.messages"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small">{getValue() ?? 0}</span>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: t("fields.createdAt"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
    ],
    [t]
  )
}
