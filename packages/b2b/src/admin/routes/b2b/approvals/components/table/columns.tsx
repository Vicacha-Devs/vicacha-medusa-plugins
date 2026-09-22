import { Badge } from "@medusajs/ui";
import { createColumnHelper } from "@tanstack/react-table";
import {  DateCell, TextCell, TextHeader } from "@vicacha-devs/medusa-shared-admin/admin";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

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
      columnHelper.accessor("approvals", {
        id: "approvals_type",
        header: t("approvals.table.type"),
        cell: ({ getValue }) => {
          const approvals = (getValue() as any[]) ?? [];
          if (!approvals.length) return <TextCell text="—" />;
          return (
            <div className="flex flex-wrap gap-1">
              {approvals.map((a: any) => (
                <Badge
                  key={a.id}
                  size="2xsmall"
                  rounded="full"
                  color={a.type === "admin" ? "blue" : "purple"}
                >
                  {a.type === "admin" ? "Admin" : "Sales Mgr"}
                </Badge>
              ))}
            </div>
          );
        },
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
      columnHelper.accessor("approvals", {
        id: "approvals_handled_by",
        header: t("approvals.table.handledBy"),
        cell: ({ getValue }) => {
          const approvals = (getValue() as any[]) ?? [];
          const names = approvals.filter((a: any) => a.handled_by).map((a: any) => a.handled_by);
          return <TextCell text={names.length ? names.join(", ") : "—"} />;
        },
      }),
      columnHelper.accessor("approvals", {
        id: "approvals_handled_at",
        header: t("approvals.table.handledAt"),
        cell: ({ getValue }) => {
          const approvals = (getValue() as any[]) ?? [];
          const dates = approvals
            .filter((a: any) => a.handled_at)
            .map((a: any) => a.handled_at)
            .sort()
            .reverse();
          return dates.length ? <DateCell date={dates[0]} /> : <TextCell text="—" />;
        },
      }),
      columnHelper.accessor("approvals", {
        id: "approvals_reason",
        header: t("approvals.table.reason"),
        cell: ({ getValue }) => {
          const approvals = (getValue() as any[]) ?? [];
          const reason = approvals.find((a: any) => a.reason)?.reason;
          return <TextCell text={reason ?? "—"} />;
        },
      }),
      columnHelper.accessor("actions", {
        header: t("approvals.table.actions"),
        cell: ({ row }) => <ApprovalActions cart={row.original} />,
      }),
    ],
    [t]
  );
};
