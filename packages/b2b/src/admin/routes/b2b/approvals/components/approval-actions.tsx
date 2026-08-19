import { Check, XMark } from "@medusajs/icons";
import { IconButton, usePrompt } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { ApprovalStatusType, ApprovalType } from "@/../types/approval";
import { useUpdateApproval } from "@/hooks/api/approvals.tsx";
import { useState } from "react";

export const ApprovalActions = ({ cart }: { cart: Record<string, any> }) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
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
    setIsApproving(true);
    const confirmed = await dialog({
      title: t("approvals.prompts.approve.title"),
      description: t("approvals.prompts.approve.description"),
    });

    if (confirmed) {
      await updateApproval({
        status: ApprovalStatusType.APPROVED,
      });
    }
    setIsApproving(false);
  };

  const rejectCart = async () => {
    setIsRejecting(true);
    const confirmed = await dialog({
      title: t("approvals.prompts.reject.title"),
      description: t("approvals.prompts.reject.description"),
    });

    if (confirmed) {
      await updateApproval({
        status: ApprovalStatusType.REJECTED,
      });
    }
    setIsRejecting(false);
  };

  if (!awaitingSalesManagerApproval) {
    return null;
  }

  if (cart.approval_status.status === ApprovalStatusType.PENDING) {
    return (
      <div className="flex gap-2">
        <IconButton
          className="w-8 h-8"
          onClick={rejectCart}
          isLoading={isRejecting}
        >
          <XMark />
        </IconButton>
        <IconButton
          className="w-8 h-8"
          onClick={approveCart}
          isLoading={isApproving}
        >
          <Check />
        </IconButton>
      </div>
    );
  }
};

export default ApprovalActions;
