import { useTranslation } from "react-i18next";
import { DataTable } from "../../../../components";
import { useDataTable } from "../../../../hooks";
import { useAdminCustomerGroups, useCompanies } from "../../../../hooks/api";
import { useCompaniesTableColumns } from "./table/columns.tsx";
import { useCompaniesTableFilters } from "./table/filters.tsx";
import { useCompaniesTableQuery } from "./table/query.tsx";

const PAGE_SIZE = 50;
const PREFIX = "comp";

export const CompaniesTable = () => {
  const { t } = useTranslation();

  const { searchParams, raw } = useCompaniesTableQuery({
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  });

  const { data, isPending } = useCompanies({
    ...searchParams,
    fields:
      "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
    order: "-created_at",
  });

  const { data: customerGroups } = useAdminCustomerGroups();

  const companies = data?.companies ?? [];
  const count = data?.count;

  const columns = useCompaniesTableColumns(customerGroups);
  const filters = useCompaniesTableFilters();

  const { table } = useDataTable({
    data: companies,
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  });

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <DataTable
        columns={columns}
        table={table}
        pagination
        navigateTo={(row) => `/b2b/companies/${row.original.id}`}
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
    </div>
  );
};
