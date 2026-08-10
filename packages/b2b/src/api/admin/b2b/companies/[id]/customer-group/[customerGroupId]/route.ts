import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { removeCompanyFromCustomerGroupWorkflow } from "../../../../../../../workflows/company/workflows/remove-company-from-customer-group.ts";
import { AdminRemoveCompanyFromCustomerGroupType } from "../../../validators.ts";

export const DELETE = async (
  req: AuthenticatedMedusaRequest<AdminRemoveCompanyFromCustomerGroupType>,
  res: MedusaResponse
) => {
  const { id, customerGroupId } = req.params;

  await removeCompanyFromCustomerGroupWorkflow.run({
    input: { company_id: id, group_id: customerGroupId },
    container: req.scope,
  });

  res.status(200).send();
};
