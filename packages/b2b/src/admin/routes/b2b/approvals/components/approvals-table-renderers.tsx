import { defineCellRenderer } from "@medusajs/dashboard/lib"
import ItemsPopover from "./approvals-items-popover.tsx"
import ApprovalStatusBadge from "./approval-status-badge.tsx"

defineCellRenderer("b2b-short-id", {
  render: (value) =>
    typeof value === "string" ? `#${value.slice(-4)}` : "-",
})

defineCellRenderer("b2b-approval-status", {
  render: (value) => (<ApprovalStatusBadge status={value} />),
})

defineCellRenderer("b2b-items", {
  render: (value, row: any) => (
    <ItemsPopover
      items={value as Record<string, any>[]}
      currencyCode={row.currency_code}
    />
  ),
})
