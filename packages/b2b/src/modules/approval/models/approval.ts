import { model } from "@medusajs/framework/utils";
import { ApprovalStatusType, ApprovalType } from "@b2b/types/approval";

export const Approval = model.define("approval", {
  id: model
    .id({
      prefix: "appr",
    })
    .primaryKey(),
  cart_id: model.text(),
  type: model.enum(ApprovalType),
  status: model.enum(ApprovalStatusType),
  created_by: model.text(),
  handled_by: model.text().nullable(),
  handled_at: model.dateTime().nullable(),
  reason: model.text().nullable(),
}).indexes([
  {
    name: "IDX_approval_cart_id",
    on: ["cart_id"],
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_approval_cart_id_type",
    on: ["cart_id", "type"],
    unique: true,
    where: "deleted_at IS NULL",
  },
  {
    name: "IDX_approval_status",
    on: ["status"],
    where: "deleted_at IS NULL",
  },
]);
