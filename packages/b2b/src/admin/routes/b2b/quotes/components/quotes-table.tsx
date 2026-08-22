import { Container, Heading, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { DataTable } from "../../../../components";
import { useDataTable } from "../../../../hooks";
import { useQuotes } from "../../../../hooks/api";
import { useQuotesTableColumns } from "./table/columns.tsx";
import { useQuotesTableFilters } from "./table/filters.tsx";
import { useQuotesTableQuery } from "./table/query.tsx";

const PAGE_SIZE = 50;
const PREFIX = "quo";

export const QuotesTable = () => {
  const { t } = useTranslation();

  const { searchParams, raw } = useQuotesTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  });

  const {
    quotes = [],
    count,
    isPending,
  } = useQuotes({
    ...searchParams,
    fields:
      "+draft_order.total,+draft_order.customer.email,*draft_order.customer.employee.company",
    order: "-created_at",
  });

  const columns = useQuotesTableColumns();
  const filters = useQuotesTableFilters();

  const { table } = useDataTable({
    data: quotes,
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
  });

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
        pagination
        navigateTo={(row) => `/b2b/quotes/${row.original.id}`}
        filters={filters}
        count={count}
        search
        isLoading={isPending}
        pageSize={PAGE_SIZE}
        orderBy={["id", "created_at"]}
        queryObject={raw}
        noRecords={{
          title: t("quotes.table.noRecordsTitle"),
          message: t("quotes.table.noRecordsMessage"),
        }}
      />
    </Container>
  );
};
