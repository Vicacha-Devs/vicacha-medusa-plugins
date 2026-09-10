import { Button, Container, Heading, Text } from "@medusajs/ui"
import { DataTable, useDataTable } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

import { useCompanies } from "../../../../hooks/api"
import { useCompaniesTableColumns } from "./table/columns"
import { useCompaniesTableFilters } from "./table/filters"
import { useCompaniesTableQuery } from "./table/query"

const PAGE_SIZE = 50
const PREFIX = "comp"

export const CompaniesTable = ({ onCreateClick }: { onCreateClick?: () => void }) => {
  const { t } = useTranslation()

  const { searchParams, raw } = useCompaniesTableQuery({ pageSize: PAGE_SIZE, prefix: PREFIX })

  const { data, isPending } = useCompanies({ ...searchParams, order: "-created_at" })
  const companies = data?.companies ?? []
  const count = data?.count

  const columns = useCompaniesTableColumns()
  const filters = useCompaniesTableFilters()

  const { table } = useDataTable({
    data: companies,
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
          <Heading>{t("companies.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("overview.nav.companies.description")}
          </Text>
        </div>
        {onCreateClick && (
          <Button size="small" variant="secondary" onClick={onCreateClick}>
            {t("actions.create")}
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        table={table}
        navigateTo={(row) => `/b2b/companies/${row.original.id}`}
        pagination
        filters={filters}
        count={count}
        search
        isLoading={isPending}
        pageSize={PAGE_SIZE}
        orderBy={["name", "created_at"]}
        prefix={PREFIX}
        queryObject={raw}
        noRecords={{
          title: t("companies.table.noRecordsTitle"),
          message: t("companies.table.noRecordsMessage"),
        }}
      />
    </Container>
  )
}
