import { useTranslation } from "react-i18next";

export const useQuotesTableFilters = () => {
  const { t } = useTranslation();

  const filters = [
    {
      label: t("fields.status"),
      key: "status",
      type: "select" as const,
      options: [
        { label: t("quotes.status.pending_merchant"), value: "pending_merchant" },
        { label: t("quotes.status.pending_customer"), value: "pending_customer" },
        { label: t("quotes.status.accepted"), value: "accepted" },
        { label: t("quotes.status.customer_rejected"), value: "customer_rejected" },
        { label: t("quotes.status.merchant_rejected"), value: "merchant_rejected" },
      ],
    },
    {
      label: t("fields.customer_id"),
      key: "customer_id",
      type: "string" as const,
    },
  ];

  return filters;
};
