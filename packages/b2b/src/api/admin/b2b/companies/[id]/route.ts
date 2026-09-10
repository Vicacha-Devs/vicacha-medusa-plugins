import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  deleteCompaniesWorkflow,
  updateCompaniesWorkflow,
} from "@b2b/workflows/company/workflows";
import {
  AdminGetCompanyParamsType,
  AdminUpdateCompanyType,
} from "../validators";

const detailFields = (base: string[]) =>
  Array.from(new Set([
    ...base,
    "*employees",
    "employees.customer.*",
    "customer_group.id",
    "customer_group.name",
    "approval_settings.*",
  ]));

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetCompanyParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: detailFields(req.queryConfig.fields),
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ company });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateCompanyType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  await updateCompaniesWorkflow.run({
    input: { ...req.body, id },
    container: req.scope,
  });

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: detailFields(req.queryConfig.fields),
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ company });
};

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const { id } = req.params;

  const { result } = await deleteCompaniesWorkflow.run({
    input: {
      id,
    },
  });

  res.status(200).json({
    id,
    object: "company",
    deleted: true,
  });
};
