import { Check, XMark } from "@medusajs/icons";
import { Button, Drawer, Label, Textarea, toast, usePrompt } from "@medusajs/ui";
import { ActionMenu } from "@vicacha-devs/medusa-shared-admin/admin";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ApprovalStatusType, ApprovalType } from "../../../../../types/approval";
import { useUpdateApproval } from "../../../../hooks/api/approvals.tsx";

export const ApprovalActions = ({ cart }: { cart: Record<string, any> }) => {
  const { t } = useTranslation();
  const dialog = usePrompt();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const pendingApproval =
    cart.approvals?.find(
      (a: any) => a.type === ApprovalType.ADMIN && a.status === ApprovalStatusType.PENDING
    ) ??
    cart.approvals?.find(
      (a: any) => a.type === ApprovalType.SALES_MANAGER && a.status === ApprovalStatusType.PENDING
    );

  const { mutateAsync: updateApproval } = useUpdateApproval(pendingApproval?.id);

  const approveCart = async () => {
    const confirmed = await dialog({
      title: t("approvals.prompts.approve.title"),
      description: t("approvals.prompts.approve.description"),
    });

    if (!confirmed) return;

    try {
      await updateApproval({ status: ApprovalStatusType.APPROVED });
      toast.success(t("approvals.toasts.approved"));
    } catch {
      toast.error(t("approvals.toasts.approveError"));
    }
  };

  const openRejectDialog = () => {
    setReason("");
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    try {
      await updateApproval({
        status: ApprovalStatusType.REJECTED,
        reason: reason.trim() || null,
      });
      toast.success(t("approvals.toasts.rejected"));
      setRejectOpen(false);
    } catch {
      toast.error(t("approvals.toasts.rejectError"));
    }
  };

  if (!pendingApproval || cart.approval_status?.status !== ApprovalStatusType.PENDING) {
    return null;
  }

  return (
    <>
      <ActionMenu
        groups={[
          {
            actions: [
              {
                label: t("actions.reject"),
                onClick: openRejectDialog,
                icon: <XMark />,
              },
            ],
          },
          {
            actions: [
              {
                label: t("actions.approve"),
                onClick: approveCart,
                icon: <Check />,
              },
            ],
          },
        ]}
      />

      <Drawer open={rejectOpen} onOpenChange={setRejectOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{t("approvals.prompts.reject.title")}</Drawer.Title>
            <Drawer.Description>
              {t("approvals.prompts.reject.description")}
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-3">
            <Label htmlFor="reject-reason">
              {t("approvals.table.reason")}
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("approvals.prompts.reject.reasonPlaceholder")}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </Drawer.Close>
            <Button variant="danger" size="small" onClick={confirmReject}>
              {t("actions.reject")}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  );
};

export default ApprovalActions;
