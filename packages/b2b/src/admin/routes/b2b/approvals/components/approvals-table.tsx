import { Container, Heading, Text } from "@medusajs/ui";
import { DataTable, useDataTable } from "@vicacha-devs/shared/admin";
import { useTranslation } from "react-i18next";

import { useApprovals } from "../../../../hooks/api";
import { useApprovalsTableColumns } from "./table/columns.tsx";
import { useApprovalsTableFilters } from "./table/filters.tsx";
import { useApprovalsTableQuery } from "./table/query.tsx";

const PAGE_SIZE = 50;

export const ApprovalsTable = () => {
  const { t } = useTranslation();

  const { searchParams, raw } = useApprovalsTableQuery({
    pageSize: PAGE_SIZE,
  });

  const { data, isPending } = useApprovals({
    ...searchParams,
    order: "-updated_at",
  });

  const columns = useApprovalsTableColumns();
  const filters = useApprovalsTableFilters();

  const { table } = useDataTable({
    data: data?.carts_with_approvals,
    columns,
    enablePagination: true,
    count: data?.count,
    pageSize: PAGE_SIZE,
  });

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("approvals.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("overview.nav.approvals.description")}
          </Text>
        </div>
      </div>
      <DataTable
        columns={columns}
        table={table}
        pagination
        filters={filters}
        count={data?.count}
        search
        isLoading={isPending}
        pageSize={PAGE_SIZE}
        orderBy={["id", "created_at"]}
        queryObject={raw}
        noRecords={{
          title: t("approvals.table.noRecordsTitle"),
          message: t("approvals.table.noRecordsMessage"),
        }}
      />
    </Container>
  );
};
