import { useTranslation } from "react-i18next";
import { ApprovalStatusType } from "../../../../../../types/approval";

export const useApprovalsTableFilters = () => {
  const { t } = useTranslation();

  const filters: unknown[] = [
    {
      label: t("approvals.filters.status"),
      key: "status",
      type: "select",
      options: [
        { label: t("approvals.filters.pending"), value: ApprovalStatusType.PENDING },
        { label: t("approvals.filters.approved"), value: ApprovalStatusType.APPROVED },
        { label: t("approvals.filters.rejected"), value: ApprovalStatusType.REJECTED },
      ],
    },
  ];

  return filters;
};
