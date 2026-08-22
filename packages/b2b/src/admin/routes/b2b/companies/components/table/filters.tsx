import { useTranslation } from "react-i18next"

export const useCompaniesTableFilters = () => {
  const { t } = useTranslation();

  const filters = [
    {
      label: t("fields.city"),
      key: "city",
      type: "string" as const,
    },
    {
      label: t("fields.state"),
      key: "state",
      type: "string" as const,
    },
    {
      label: t("fields.country"),
      key: "country",
      type: "string" as const,
    },
  ];

  return filters;
};
