import { Container, Heading, Text } from "@medusajs/ui";
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
    count,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    prefix: PREFIX,
  });

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("companies.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("overview.nav.companies.description")}
          </Text>
        </div>
      </div>
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
    </Container>
  );
};
