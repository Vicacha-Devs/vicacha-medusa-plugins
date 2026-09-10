import { defineCellRenderer } from "@medusajs/dashboard/lib"
import { Badge } from "@medusajs/ui"
import { getLocaleAmount } from "@vicacha-devs/medusa-shared-admin/admin"

defineCellRenderer("b2b-employee-name", {
  render: (value) => {
    const customer = value as any
    const name = [customer?.first_name, customer?.last_name].filter(Boolean).join(" ")
    return name || "—"
  },
})

defineCellRenderer("b2b-employee-email", {
  render: (_value, row) => {
    return (row as any)?.customer?.email || "—"
  },
})

defineCellRenderer("b2b-employee-spending-limit", {
  render: (value, row, _column, t) => {
    const currency = (row as any)?.company?.currency_code
    if (!value || value === 0) {
      return t("quotes.detail.unlimited")
    }
    
    return currency ? getLocaleAmount(Number(value), currency) : String(value)
  },
})

defineCellRenderer("b2b-employee-is-admin", {
  render: (value, _row, _column, t) => {
    return value ? (
      <Badge size="2xsmall" color="green">
        {t("employees.admin")}
      </Badge>
    ) : null
  },
})

defineCellRenderer("b2b-employee-is-active", {
  render: (value, _row, _column, t) => {
    return value ? (
      <Badge size="2xsmall" color="green">
        {t("employees.active")}
      </Badge>
    ) : (
      <Badge size="2xsmall" color="grey">
        {t("employees.inactive")}
      </Badge>
    )
  },
})
