import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { addCompanyToCustomerGroupWorkflow } from "@b2b/workflows/company/workflows";
import { AdminAddCompanyToCustomerGroupType } from "@b2b/api/admin/b2b/companies/validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddCompanyToCustomerGroupType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;
  const { group_id } = req.body;

  await addCompanyToCustomerGroupWorkflow.run({
    input: { company_id: id, group_id },
    container: req.scope,
  });

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig?.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ company });
};
