import { useTranslation } from "react-i18next";

import { DataTableStatusCell } from "@vicacha-devs/medusa-shared-admin/admin";

const StatusColors: Record<string, "green" | "orange" | "red" | "blue"> = {
  accepted: "green",
  customer_rejected: "orange",
  merchant_rejected: "red",
  pending_merchant: "blue",
  pending_customer: "blue",
};

export default function QuoteStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();

  const titles: Record<string, string> = {
    accepted: t("quotes.status.accepted"),
    customer_rejected: t("quotes.status.customer_rejected"),
    merchant_rejected: t("quotes.status.merchant_rejected"),
    pending_merchant: t("quotes.status.pending_merchant"),
    pending_customer: t("quotes.status.pending_customer"),
  };

  return (
    <DataTableStatusCell color={StatusColors[status]}>
      {titles[status]}
    </DataTableStatusCell>
  );
}
