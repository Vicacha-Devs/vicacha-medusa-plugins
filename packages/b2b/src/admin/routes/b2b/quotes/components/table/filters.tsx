import { useTranslation } from "react-i18next"
import { EQuoteStatus } from "../../../../../../types"

export const useQuotesTableFilters = () => {
  const { t } = useTranslation()

  return [
    {
      label: t("fields.status"),
      key: "status",
      type: "select" as const,
      options: [
        { label: t("quotes.status.pending_merchant"), value: EQuoteStatus.PendingMerchant },
        { label: t("quotes.status.pending_customer"), value: EQuoteStatus.PendingCustomer },
        { label: t("quotes.status.accepted"), value: EQuoteStatus.Accepted },
        { label: t("quotes.status.customer_rejected"), value: EQuoteStatus.CustomerRejected },
        { label: t("quotes.status.merchant_rejected"), value: EQuoteStatus.MerchantRejected },
      ],
    },
    {
      label: t("quotes.filters.customerId"),
      key: "customer_id",
      type: "string" as const,
    },
    {
      label: t("quotes.filters.draftOrderId"),
      key: "draft_order_id",
      type: "string" as const,
    },
  ]
}
