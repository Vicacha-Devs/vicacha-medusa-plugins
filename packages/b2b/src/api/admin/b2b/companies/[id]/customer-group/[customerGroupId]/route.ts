import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { removeCompanyFromCustomerGroupWorkflow } from "@b2b/workflows/company/workflows/remove-company-from-customer-group";
import { AdminRemoveCompanyFromCustomerGroupType } from "@b2b/api/admin/b2b/companies/validators";

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
