import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createCompaniesWorkflow } from "@b2b/workflows/company/workflows/create-companies";
import { AdminCreateCompanyType } from "./validators";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { fields, pagination } = req.queryConfig;

  const { q, customer_group_id, ...filterableFields } = req.filterableFields as Record<
    string,
    any
  >;

  const filters: Record<string, any> = { ...filterableFields };

  if (customer_group_id) {
    filters.customer_group = { id: customer_group_id };
  }

  if (q) {
    filters.$or = [
      { name: { $ilike: `%${q}%` } },
      { email: { $ilike: `%${q}%` } },
      { phone: { $ilike: `%${q}%` } },
      { city: { $ilike: `%${q}%` } },
    ];
  }

  const listFields = Array.from(new Set([
    ...fields,
    "employees.id",
    "customer_group.id",
    "customer_group.name",
    "approval_settings.*",
  ]))

  const { data: companies, metadata } = await query.graph({
    entity: "companies",
    fields: listFields,
    filters,
    pagination,
  });

  const companiesWithCount = companies.map((company: any) => {
    const { employees, customer_group, ...rest } = company
    const group = Array.isArray(customer_group) ? customer_group[0] : customer_group

    return {
      ...rest,
      employees_count: Array.isArray(employees) ? employees.length : 0,
      customer_group: group ? { id: group.id, name: group.name } : null,
    }
  });

  res.json({
    companies: companiesWithCount,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<
    AdminCreateCompanyType | AdminCreateCompanyType[]
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { result: createdCompanies } = await createCompaniesWorkflow.run({
    input: Array.isArray(req.validatedBody)
      ? req.validatedBody.map((company) => ({ ...company }))
      : [{ ...req.validatedBody }],
    container: req.scope,
  });

  const { data: companies } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id: createdCompanies.map((company) => company.id) },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ companies });
};
