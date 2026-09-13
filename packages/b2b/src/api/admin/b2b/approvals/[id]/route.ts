import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { updateApprovalsWorkflow } from "@b2b/workflows/approval/workflows";
import { AdminUpdateApprovalType } from "../validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApprovalType>,
  res: MedusaResponse
) => {
  const { user_id } = req.auth_context.app_metadata as {
    user_id: string;
  };

  const { id: approvalId } = req.params;
  const { status, reason } = req.validatedBody;

  const { result: approval, errors } = await updateApprovalsWorkflow.run({
    input: {
      status,
      reason,
      handled_by: user_id,
      id: approvalId,
    },
    container: req.scope,
  });

  if (errors.length > 0) {
    res.status(400).json({
      message: errors[0].error.message,
      code: "INVALID_DATA",
    });
    return;
  }
  res.json({ approval });
};
