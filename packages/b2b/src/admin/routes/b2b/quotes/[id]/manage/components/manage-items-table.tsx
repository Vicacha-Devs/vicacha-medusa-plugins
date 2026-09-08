import {
  DataTable,
  DataTablePaginationState,
  DataTableRowSelectionState,
  DataTableSortingState,
  createDataTableColumnHelper,
  useDataTable,
} from "@medusajs/ui";
import { useVariants } from "@vicacha-devs/medusa-shared-admin/admin";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { PAGE_SIZE } from "../../../../../../constants";
import { useManageItemsTableColumns } from "./table/columns";
import { useManageItemsTableFilters } from "./table/filters";
import { useManageItemsTableQuery } from "./table/query";

type ManageItemsTableProps = {
  onSelectionChange: (ids: string[]) => void;
  prefix?: string;
};

const columnHelper = createDataTableColumnHelper<any>()

export const ManageItemsTable = ({
  onSelectionChange,
  prefix,
}: ManageItemsTableProps) => {
  const { t } = useTranslation()
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({});
  const [sorting, setSorting] = useState<DataTableSortingState | null>(null);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const { searchParams } = useManageItemsTableQuery({ pageSize: PAGE_SIZE, prefix })

  const orderParam = sorting
    ? `${sorting.desc ? "-" : ""}${sorting.id}`
    : searchParams.order

  const { variants = [], count, isPending, isError, error } = useVariants({
    ...searchParams,
    q: search || searchParams.q,
    order: orderParam,
    limit: PAGE_SIZE,
    offset: pagination.pageIndex * PAGE_SIZE,
    fields: "*inventory_items.inventory.location_levels,+inventory_quantity",
  });

  const filters = useManageItemsTableFilters()
  const baseColumns = useManageItemsTableColumns();
  const columns = useMemo(
    () => [columnHelper.select(), ...baseColumns],
    [baseColumns]
  );

  const instance = useDataTable({
    columns,
    data: variants,
    getRowId: (row) => row.id,
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: (state) => {
        setRowSelection(state);
        onSelectionChange(Object.keys(state));
      },
      enableRowSelection: true,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    sorting: {
      state: sorting,
      onSortingChange: setSorting,
    },
    filters,
    pagination: {  
      state: pagination,
      onPaginationChange: setPagination,
    },
    rowCount: count ?? 0,
    isLoading: isPending,
  });

  if (isError) throw error

  return (
    <DataTable instance={instance}>
      <DataTable.Toolbar className="px-6 py-4">
        <div className="flex w-full items-center justify-end gap-x-2">
          <DataTable.FilterMenu />
          <DataTable.SortingMenu />
          <DataTable.Search
            placeholder={t("quotes.manage.searchPlaceholder")}
          />
        </div>
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Pagination />
    </DataTable>
  );
};
