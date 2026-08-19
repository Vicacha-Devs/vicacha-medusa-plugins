import { WorkflowResponse } from "@medusajs/framework/workflows-sdk";
import { createWorkflow } from "@medusajs/framework/workflows-sdk";
import { ModuleDeleteCompany } from "@b2b/types";
import { deleteApprovalSettingsStep } from "@b2b/workflows/approval/steps/delete-approval-settings";
import { deleteCompaniesStep } from "../steps";

export const deleteCompaniesWorkflow = createWorkflow(
  "delete-companies",
  function (input: ModuleDeleteCompany) {
    deleteCompaniesStep([input.id]);

    deleteApprovalSettingsStep({
      companyIds: [input.id],
    });

    return new WorkflowResponse(undefined);
  }
);
