import {
  authenticate,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework";
import { MiddlewareRoute } from "@medusajs/medusa";
import { approvalTransformQueryConfig } from "./query-config.ts";
import { AdminGetApprovals, AdminUpdateApproval } from "./validators.ts";

export const adminApprovalsMiddlewares: MiddlewareRoute[] = [
  {
    method: "ALL",
    matcher: "/admin/b2b/approvals*",
    middlewares: [authenticate("user", ["session", "bearer"])],
  },
  {
    method: ["GET"],
    matcher: "/admin/b2b/approvals",
    middlewares: [
      validateAndTransformQuery(
        AdminGetApprovals,
        approvalTransformQueryConfig
      ),
    ],
  },
  {
    method: ["POST"],
    matcher: "/admin/b2b/approvals/:id",
    middlewares: [validateAndTransformBody(AdminUpdateApproval)],
  },
];
