import { defineCellRenderer } from "@medusajs/dashboard/lib"
import { Link } from "react-router-dom"

import QuoteStatusBadge from "./quote-status-badge"

defineCellRenderer("b2b-display-id-prefix", {
  render: (value) => (value != null ? `#${value}` : "-"),
})

defineCellRenderer("b2b-quote-status", {
  render: (value) => <QuoteStatusBadge status={value as string} />,
})

defineCellRenderer("b2b-quote-total", {
  render: (value, row: any) => {
    const amount = value as number | null
    if (amount == null) return "-"
    const currencyCode = (row?.draft_order?.currency_code ?? "USD").toUpperCase()
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(amount / 100)
  },
})

defineCellRenderer("b2b-quote-customer-link", {
  render: (value: { id?: string, full_name?: string}) => {
    if (!value.id) return "-"
    
    return (
      <Link
        to={`/customers/${value.id}`}
        className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
      >
        {value.full_name || value.id}
      </Link>
    )
  },
})

defineCellRenderer("b2b-quote-draft-order-link", {
  render: (value: string, row: any) => {
    if (!value) return "-"
    const displayId = row?.draft_order?.display_id
    return (
      <Link
        to={`/orders/${value}`}
        className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
      >
        {displayId != null ? `#${displayId}` : value}
      </Link>
    )
  },
})

defineCellRenderer("b2b-quote-order-change-link", {
  render: (value: string, row: any) => {
    if (!value) return "-"

    const draftOrderId = row?.draft_order?.id ?? row?.draft_order_id
    if (draftOrderId) {
      return (
        <Link
          to={`/orders/${draftOrderId}`}
          className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover transition-colors"
        >
          {value}
        </Link>
      )
    }
    return <span className="txt-compact-small text-ui-fg-subtle">{value}</span>
  },
})

defineCellRenderer("b2b-quote-cart-link", {
  render: (value: string) => {
    if (!value) return "-"

    return (
      <span className="txt-compact-small text-ui-fg-subtle">
        {value}
      </span>
    )
  },
})

defineCellRenderer("b2b-quote-messages-count", {
  render: (value: any) => {
    const count = Array.isArray(value) ? value.length : 0
    return <span className="txt-compact-small">{count}</span>
  },
})
