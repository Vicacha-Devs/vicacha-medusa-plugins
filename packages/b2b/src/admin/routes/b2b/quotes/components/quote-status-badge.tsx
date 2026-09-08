import { DataTableStatusCell } from "@vicacha-devs/medusa-shared-admin/admin"
import { useTranslation } from "react-i18next"

const statusColors: Record<string, "red" | "purple" | "green" | "grey"> = {
  pending_merchant: "purple",
  pending_customer: "purple",
  accepted: "green",
  customer_rejected: "red",
  merchant_rejected: "red",
}

export default function QuoteStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()

  const labels: Record<string, string> = {
    pending_merchant: t("quotes.status.pending_merchant"),
    pending_customer: t("quotes.status.pending_customer"),
    accepted: t("quotes.status.accepted"),
    customer_rejected: t("quotes.status.customer_rejected"),
    merchant_rejected: t("quotes.status.merchant_rejected"),
  }

  return (
    <DataTableStatusCell color={statusColors[status] ?? "grey"}>
      {labels[status] ?? status}
    </DataTableStatusCell>
  )
}
