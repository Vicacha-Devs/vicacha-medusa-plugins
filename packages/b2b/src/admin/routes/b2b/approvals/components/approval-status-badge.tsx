import { DataTableStatusCell } from "@vicacha-devs/medusa-shared-admin/admin";
import { useTranslation } from "react-i18next";

const StatusColors: Record<string, "red" | "purple" | "green"> = {
  approved: "green",
  pending: "purple",
  rejected: "red",
};

export default function ApprovalStatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
  
    const titles: Record<string, string> = {
    accepted: t("approvals.filters.approved"),
    pending: t("approvals.filters.pending"),
    rejected: t("approvals.filters.rejected")
  };

  return(
    <DataTableStatusCell color={StatusColors[status]}>
        {titles[status]}
    </DataTableStatusCell>
  )
}