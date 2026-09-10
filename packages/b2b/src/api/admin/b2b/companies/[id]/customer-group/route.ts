import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  addCompanyToCustomerGroupWorkflow,
  removeCompanyFromCustomerGroupWorkflow,
} from "@b2b/workflows/company/workflows";
import { AdminAddCompanyToCustomerGroupType } from "@b2b/api/admin/b2b/companies/validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminAddCompanyToCustomerGroupType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;
  const { group_id } = req.body;

  // The company↔customerGroup link is one-to-one (no isList on defineLink).
  // Remove the existing group first so createRemoteLinkStep doesn't reject.
  const { data: [existing] } = await query.graph({
    entity: "companies",
    fields: ["customer_group.id"],
    filters: { id },
  });

  const existingGroupId: string | undefined = (existing as any)?.customer_group?.id;

  if (existingGroupId && existingGroupId !== group_id) {
    await removeCompanyFromCustomerGroupWorkflow.run({
      input: { company_id: id, group_id: existingGroupId },
      container: req.scope,
    });
  }

  if (!existingGroupId || existingGroupId !== group_id) {
    await addCompanyToCustomerGroupWorkflow.run({
      input: { company_id: id, group_id },
      container: req.scope,
    });
  }

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
