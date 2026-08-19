import { defineLink } from "@medusajs/framework/utils";
import CompanyModule from "@b2b/modules/company";
import ApprovalModule from "@b2b/modules/approval";

export default defineLink(
  CompanyModule.linkable.company,
  ApprovalModule.linkable.approvalSettings
);
