import { useTranslation } from "react-i18next";
import { DataTable } from "@/components";
import { useDataTable } from "@/hooks";
import { useApprovals } from "@/hooks/api";
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
    <div className="flex size-full flex-col overflow-hidden">
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
    </div>
  );
};
