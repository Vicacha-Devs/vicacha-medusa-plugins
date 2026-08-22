import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { TextCell, TextHeader, DateCell } from "@vicacha-devs/shared/admin";
import { ApprovalActions } from "../approval-actions.tsx";
import ItemsPopover from "../approvals-items-popover.tsx";
import ApprovalStatusBadge from "../approval-status-badge.tsx";


const columnHelper = createColumnHelper<unknown>();

export const useApprovalsTableColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("id", {
        header: t("fields.id"),
        cell: ({ getValue }) => <TextCell text={`#${getValue().slice(-4)}`} />,
      }),
      columnHelper.accessor("updated_at", {
        header: t("approvals.table.updatedAt"),
        cell: ({ getValue }) => <DateCell date={getValue()} />,
      }),
      columnHelper.accessor("company.name", {
        header: () => <TextHeader text={t("fields.company")} />,
        cell: ({ getValue }) => <TextCell text={getValue()} />,
      }),
      columnHelper.accessor("approval_status.status", {
        header: t("fields.status"),
        cell: ({ getValue }) => <ApprovalStatusBadge status={getValue()}/>,
      }),
      columnHelper.accessor("items", {
        header: t("fields.items"),
        cell: ({ getValue, row }) => (
          <ItemsPopover
            items={getValue()}
            currencyCode={row.original.currency_code}
          />
        ),
      }),
      columnHelper.accessor("actions", {
        header: t("approvals.table.actions"),
        cell: ({ row }) => <ApprovalActions cart={row.original} />,
      }),
    ],
    [t]
  );
};
