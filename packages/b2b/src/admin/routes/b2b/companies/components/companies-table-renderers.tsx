import { defineCellRenderer } from "@medusajs/dashboard/lib"

defineCellRenderer("b2b-company-address", {
  render: (value, row: any) => {
    const parts = [value, row.city, row.state, row.zip].filter(Boolean)
    return parts.length ? (parts as string[]).join(", ") : "-"
  },
})

defineCellRenderer("b2b-employees-count", {
  render: (value) => {
    const arr = value as any[] | undefined
    return arr?.length ?? 0
  },
})
