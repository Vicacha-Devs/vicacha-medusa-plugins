import { model } from "@medusajs/framework/utils";
import { ApprovalStatusType } from "@b2b/types/approval";

export const ApprovalStatus = model.define("approval_status", {
  id: model
    .id({
      prefix: "apprstat",
    })
    .primaryKey(),
  cart_id: model.text(),
  status: model.enum(ApprovalStatusType),
}).indexes([
  {
    name: "IDX_approval_status_cart_id",
    on: ["cart_id"],
    unique: true,
    where: "deleted_at IS NULL",
  },
]);
