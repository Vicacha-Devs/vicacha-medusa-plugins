import { Container, Heading, Text } from "@medusajs/ui"
import { DataTable, useDataTable } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"
import { useQuotes } from "../../../../hooks/api"
import { useQuotesTableColumns } from "./table/columns"
import { useQuotesTableFilters } from "./table/filters"
import { useQuotesTableQuery } from "./table/query"

const PAGE_SIZE = 50
const PREFIX = "quot"

export const QuotesTable = () => {
  const { t } = useTranslation()

  const { searchParams, raw } = useQuotesTableQuery({ pageSize: PAGE_SIZE, prefix: PREFIX })

  const result = useQuotes({ ...searchParams, order: "-created_at" })
  const quotes = result.quotes ?? []
  const count = result.count

  const columns = useQuotesTableColumns()
  const filters = useQuotesTableFilters()

  const { table } = useDataTable({
    data: quotes,
    columns,
    count,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
    getRowId: (row) => row.id,
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("quotes.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("overview.nav.quotes.description")}
          </Text>
        </div>
      </div>
      <DataTable
        columns={columns}
        table={table}
        navigateTo={(row) => `/b2b/quotes/${row.original.id}`}
        pagination
        filters={filters}
        count={count}
        search
        isLoading={result.isPending}
        pageSize={PAGE_SIZE}
        orderBy={["created_at"]}
        prefix={PREFIX}
        queryObject={raw}
        noRecords={{
          title: t("quotes.table.noRecordsTitle"),
          message: t("quotes.table.noRecordsMessage"),
        }}
      />
    </Container>
  )
}
