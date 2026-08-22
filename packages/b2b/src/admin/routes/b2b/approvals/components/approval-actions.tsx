import { Check, XMark } from "@medusajs/icons";
import { usePrompt } from "@medusajs/ui";
import { ActionMenu } from "@vicacha-devs/shared/admin";
import { useTranslation } from "react-i18next";

import { ApprovalStatusType, ApprovalType } from "../../../../../types/approval";
import { useUpdateApproval } from "../../../../hooks/api/approvals.tsx";

export const ApprovalActions = ({ cart }: { cart: Record<string, any> }) => {
  const { t } = useTranslation();

  const dialog = usePrompt();

  const awaitingSalesManagerApproval = cart.approvals.find(
    (approval) =>
      approval.type === ApprovalType.SALES_MANAGER &&
      approval.status === ApprovalStatusType.PENDING
  );

  const { mutateAsync: updateApproval } = useUpdateApproval(
    awaitingSalesManagerApproval?.id
  );

  const approveCart = async () => {
    const confirmed = await dialog({
      title: t("approvals.prompts.approve.title"),
      description: t("approvals.prompts.approve.description"),
    });

    if (confirmed) {
      await updateApproval({
        status: ApprovalStatusType.APPROVED,
      });
    }
  };

  const rejectCart = async () => {
    const confirmed = await dialog({
      title: t("approvals.prompts.reject.title"),
      description: t("approvals.prompts.reject.description"),
    });

    if (confirmed) {
      await updateApproval({
        status: ApprovalStatusType.REJECTED,
      });
    }
  };

  if (!awaitingSalesManagerApproval) {
    return null;
  }

  if (cart.approval_status.status === ApprovalStatusType.PENDING) {
    return (
      <ActionMenu
        groups={[
          {
            actions: [
              {
                label: t('actions.reject'),
                onClick: rejectCart,
                icon: <XMark />
              }
            ]
          },
          {
            actions: [
              {
                label: t('actions.approve'),
                onClick: approveCart,
                icon: <Check />
              }
            ]
          }
        ]}
      />
    );
  }
};

export default ApprovalActions;
