import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createEmployeesWorkflow } from "@b2b/workflows/employee/workflows";
import {
  AdminCreateEmployeeType,
  AdminGetEmployeeParamsType,
} from "@b2b/api/admin/b2b/companies/validators";

export const GET = async (
  req: MedusaRequest<AdminGetEmployeeParamsType>,
  res: MedusaResponse
) => {
  const { id } = req.params;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const employeeFields = [
    "id",
    "spending_limit",
    "is_admin",
    "is_active",
    "company_id",
    "customer.id",
    "customer.first_name",
    "customer.last_name",
    "customer.email",
    "customer.phone",
    "company.currency_code",
  ]

  const rawPagination = req.queryConfig.pagination as any
  const rawOrder = rawPagination.order
  const cleanOrder = rawOrder
    ? Object.fromEntries(Object.entries(rawOrder).filter(([k]) => k && k !== "undefined"))
    : undefined

  const pagination: any = { skip: rawPagination.skip, take: rawPagination.take }
  if (cleanOrder && Object.keys(cleanOrder).length > 0) pagination.order = cleanOrder

  const filters: Record<string, any> = { company_id: id }
  const rawIsAdmin = (req.query as any).is_admin
  const rawIsActive = (req.query as any).is_active
  if (rawIsAdmin !== undefined) filters.is_admin = rawIsAdmin === "true"
  if (rawIsActive !== undefined) filters.is_active = rawIsActive === "true"

  const { data: employees, metadata } = await query.graph({
    entity: "employee",
    fields: employeeFields,
    filters,
    pagination,
  });

  res.json({
    employees,
    count: metadata?.count,
    offset: metadata?.skip,
    limit: metadata?.take,
  });
};

export const POST = async (
  req: MedusaRequest<AdminCreateEmployeeType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const { result: createdEmployee } = await createEmployeesWorkflow.run({
    input: {
      employeeData: { ...req.validatedBody, company_id: id },
      customerId: req.validatedBody.customer_id,
    },
    container: req.scope,
  });

  const {
    data: [employee],
  } = await query.graph(
    {
      entity: "employee",
      fields: req.queryConfig.fields,
      filters: { id: createdEmployee.id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ employee });
};
