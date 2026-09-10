import { createColumnHelper } from "@tanstack/react-table"
import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { DateCell } from "@vicacha-devs/medusa-shared-admin/admin"
import { QueryCompany } from "../../../../../../types"

const columnHelper = createColumnHelper<QueryCompany>()

export const useCompaniesTableColumns = () => {
  const { t } = useTranslation()

  return useMemo(
    () => [
      columnHelper.accessor("logo_url", {
        header: "",
        cell: ({ getValue }) => {
          const url = getValue()
          if (!url) return null
          return (
            <img
              src={url}
              alt=""
              className="h-6 w-auto max-w-[48px] object-contain"
            />
          )
        },
      }),
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small font-medium">{getValue()}</span>
        ),
      }),
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("phone", {
        header: t("fields.phone"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small">{getValue() || "—"}</span>
        ),
      }),
      columnHelper.accessor("country" as any, {
        header: t("fields.country"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small">{(getValue() as string) || "—"}</span>
        ),
      }),
      columnHelper.accessor("currency_code" as any, {
        header: t("fields.currency"),
        cell: ({ getValue }) => {
          const code = getValue() as string | null
          return (
            <span className="txt-compact-small">
              {code ? code.toUpperCase() : "—"}
            </span>
          )
        },
      }),
      columnHelper.accessor("employees_count" as any, {
        header: t("companies.table.employees"),
        cell: ({ getValue }) => (
          <span className="txt-compact-small">{(getValue() as number) ?? 0}</span>
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
