import { HttpTypes } from "@medusajs/framework/types";
import { Avatar, Badge } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { QueryCompany } from "../../../../../../types";
import { TextCell } from "../../../../../components/common/table/table-cells/text-cell.tsx";
import { CompanyActionsMenu } from "../company-actions-menu.tsx";

const columnHelper = createColumnHelper<QueryCompany>();

export const useCompaniesTableColumns = (
  customerGroups?: HttpTypes.AdminCustomerGroup[]
) => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "avatar",
        header: "",
        cell: ({ row }) => (
          <Avatar
            src={row.original.logo_url || undefined}
            fallback={row.original.name?.charAt(0) ?? ""}
          />
        ),
      }),
      columnHelper.accessor("name", {
        header: t("fields.name"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("phone", {
        header: t("fields.phone"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("email", {
        header: t("fields.email"),
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.display({
        id: "address",
        header: t("fields.address"),
        cell: ({ row }) => {
          const { address, city, state, zip } = row.original;
          const parts = [address, city, state, zip].filter(Boolean);
          return <TextCell text={parts.join(", ")} />;
        },
      }),
      columnHelper.display({
        id: "employees",
        header: "Employees",
        cell: ({ row }) => (
          <TextCell text={row.original.employees?.length ?? 0} />
        ),
      }),
      columnHelper.display({
        id: "customer_group",
        header: "Customer Group",
        cell: ({ row }) =>
          row.original.customer_group?.name ? (
            <Badge size="small" color="blue">
              {row.original.customer_group.name}
            </Badge>
          ) : (
            <TextCell text="-" />
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <CompanyActionsMenu
            company={row.original}
            customerGroups={customerGroups}
          />
        ),
      }),
    ],
    [t, customerGroups]
  );
};
