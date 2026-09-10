import { defineCellRenderer } from "@medusajs/dashboard/lib"
import { COUNTRY_BY_ISO2 } from "@vicacha-devs/medusa-shared-admin/admin"
import { Link } from "react-router-dom"

defineCellRenderer("b2b-company-address", {
  render: (value, row: any) => {
    const parts = [row?.address, row?.city, row?.state, row?.country ? COUNTRY_BY_ISO2.get(row.country) : false].filter(Boolean)
    return parts.length ? parts.join(", ") : "—"
  },
})

defineCellRenderer("b2b-employees-count", {
  render: (value) => {
    const count = (value as number) ?? 0
    return <span className="txt-compact-small">{count}</span>
  },
})

defineCellRenderer("b2b-company-country", {
  render: (value) => {
    const str = value as string | null
    
    return str ? COUNTRY_BY_ISO2.get(str.toLocaleLowerCase()) : "—"
  },
})

defineCellRenderer("b2b-company-currency", {
  render: (value) => {
    const code = value as string | null
    return code ? code.toUpperCase() : "—"
  },
})

defineCellRenderer("b2b-company-customer-group", {
  render: (value) => {
    const group = Array.isArray(value) ? value[0] : (value as any)
    if (!group?.id) return "—"
    return (
      <Link
        to={`/customer-groups/${group.id}`}
        className="txt-compact-small text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
        onClick={(e) => e.stopPropagation()}
      >
        {group.name || group.id}
      </Link>
    )
  },
})
