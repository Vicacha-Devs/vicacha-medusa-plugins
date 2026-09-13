import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { APPROVAL_MODULE } from "@b2b/modules/approval";
import {
  ApprovalStatusType,
  IApprovalModuleService,
  ModuleApproval,
  ModuleUpdateApproval,
} from "@b2b/types";

export const updateApprovalStep = createStep(
  "update-approval",
  async (
    input: ModuleUpdateApproval,
    { container }
  ): Promise<StepResponse<ModuleApproval, ModuleUpdateApproval[]>> => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE);

    const {
      data: [approval],
    } = await query.graph({
      entity: "approval",
      fields: ["*"],
      filters: {
        id: input.id,
      },
    });

    const rollbackData: ModuleUpdateApproval[] = [
      {
        id: approval.id,
        status: approval.status as unknown as ApprovalStatusType,
        handled_by: approval.handled_by,
      } as ModuleUpdateApproval,
    ];

    if (input.status === ApprovalStatusType.REJECTED) {
      const { data: approvalsToReject } = await query.graph({
        entity: "approval",
        fields: ["*"],
        filters: {
          cart_id: approval.cart_id,
          id: { $ne: approval.id },
        },
      });

      const rejectedAt = new Date().toISOString();

      for (const sibling of approvalsToReject) {
        rollbackData.push({
          id: sibling.id,
          status: sibling.status as unknown as ApprovalStatusType,
          handled_by: sibling.handled_by,
          handled_at: sibling.handled_at,
        } as ModuleUpdateApproval);
      }

      await approvalModule.updateApprovals(
        approvalsToReject.map((a) => ({
          id: a.id,
          status: ApprovalStatusType.REJECTED,
          handled_by: input.handled_by,
          handled_at: rejectedAt,
        }))
      );
    }

    const [updatedApproval] = await approvalModule.updateApprovals([{
      ...input,
      handled_at: new Date().toISOString(),
    }]);

    return new StepResponse(updatedApproval, rollbackData);
  },
  async (rollbackData: ModuleUpdateApproval[] | undefined, { container }) => {
    if (!rollbackData) return;

    const approvalModule =
      container.resolve<IApprovalModuleService>(APPROVAL_MODULE);

    await approvalModule.updateApprovals(rollbackData);
  }
);
