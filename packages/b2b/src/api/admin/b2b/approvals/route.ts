import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { AdminGetApprovalsType } from "./validators";

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetApprovalsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { status, q } = req.validatedQuery || {};

  let filters: any = {};

  if (status) {
    filters.status = status;
  }

  if (q) {
    filters.cart = {
      company: {
        name: { $ilike: `%${q}%` },
      },
    };
  }

  const { data: approvalStatuses, metadata } = await query.graph({
    entity: "approval_status",
    ...req.queryConfig,
    fields: [
      "*",
      "cart.*",
      "cart.approvals.*",
      "cart.company.approval_settings.*",
      "cart.company.*",
      "cart.items.*",
      "cart.completed_at",
    ],
    filters: {
      ...filters,
    },
  });

  let carts = approvalStatuses
    .map((approvalStatus) => {
      const { cart, ...approvalStatusData } = approvalStatus;
      if (!cart) return null;
      return { ...cart, approval_status: approvalStatusData };
    })
    .filter(Boolean);

  res.json({
    carts_with_approvals: carts,
    ...metadata,
  });
};
