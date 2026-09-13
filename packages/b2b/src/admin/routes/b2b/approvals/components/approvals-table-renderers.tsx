import { defineCellRenderer } from "@medusajs/dashboard/lib"
import { Badge } from "@medusajs/ui"
import { getI18n } from "react-i18next"
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

defineCellRenderer("b2b-approval-type", {
  render: (value: any) => {
    const approvals: any[] = Array.isArray(value) ? value : []
    if (!approvals.length) return "-"
    const t = getI18n().t
    return (
      <div className="flex flex-wrap gap-1">
        {approvals.map((a: any) => (
          <Badge
            key={a.id}
            size="2xsmall"
            rounded="full"
            color={a.type === "admin" ? "blue" : "purple"}
          >
            {a.type === "admin"
              ? t("approvals.types.admin")
              : t("approvals.types.salesManager")}
          </Badge>
        ))}
      </div>
    )
  },
})

defineCellRenderer("b2b-approval-handled-by", {
  render: (value: any) => {
    const approvals: any[] = Array.isArray(value) ? value : []
    const names = approvals.filter((a) => a.handled_by).map((a) => a.handled_by)
    return names.length ? names.join(", ") : "-"
  },
})

defineCellRenderer("b2b-approval-handled-at", {
  render: (value: any) => {
    const approvals: any[] = Array.isArray(value) ? value : []
    const dates = approvals
      .filter((a) => a.handled_at)
      .map((a) => a.handled_at)
      .sort()
      .reverse()
    if (!dates.length) return "-"
    return new Date(dates[0]).toLocaleDateString()
  },
})

defineCellRenderer("b2b-approval-reason", {
  render: (value: any) => {
    const approvals: any[] = Array.isArray(value) ? value : []
    return approvals.find((a) => a.reason)?.reason ?? "-"
  },
})
