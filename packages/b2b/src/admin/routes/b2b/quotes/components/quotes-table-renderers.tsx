import { defineCellRenderer } from "@medusajs/dashboard/lib"
import QuoteStatusBadge from "./quote-status-badge.tsx"

defineCellRenderer("b2b-display-id-prefix", {
  render: (value) => (value != null ? `#${value}` : "-"),
})

defineCellRenderer("b2b-quote-status", {
  render: (value) => <QuoteStatusBadge status={value as string} />,
})

defineCellRenderer("b2b-quote-total", {
  render: (value, row: any) => {
    const currency = (row.draft_order?.currency_code as string | undefined)
      ?.toUpperCase()
    if (currency == null || value == null) {
      return "-"
    }
    return `${currency} ${value}`
  },
})
