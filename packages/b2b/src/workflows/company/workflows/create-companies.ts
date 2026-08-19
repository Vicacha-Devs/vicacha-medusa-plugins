import { createRemoteLinkStep } from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { APPROVAL_MODULE } from "@b2b/modules/approval";
import { COMPANY_MODULE } from "@b2b/modules/company";
import { ModuleCreateCompany } from "@b2b/types";
import { createApprovalSettingsStep } from "@b2b/workflows/approval/steps/create-approval-settings";
import { createCompaniesStep } from "../steps";

export const createCompaniesWorkflow = createWorkflow(
  "create-companies",
  function (input: ModuleCreateCompany[]) {
    const companies = createCompaniesStep(input);

    const approvalSettings = createApprovalSettingsStep(companies);

    const linkData = transform(approvalSettings, (settings) =>
      settings.map((setting) => ({
        [COMPANY_MODULE]: {
          company_id: setting.company_id,
        },
        [APPROVAL_MODULE]: {
          approval_settings_id: setting.id,
        },
      }))
    );

    createRemoteLinkStep(linkData);

    return new WorkflowResponse(companies);
  }
);
