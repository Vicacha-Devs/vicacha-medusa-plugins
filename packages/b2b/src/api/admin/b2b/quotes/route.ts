import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { AdminGetQuoteParamsType } from "./validators";

export const GET = async (
  req: MedusaRequest<AdminGetQuoteParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { fields, pagination } = req.queryConfig;

  const { q, ...filterableFields } = (req.filterableFields ?? {}) as Record<
    string,
    any
  >;

  const filters: Record<string, any> = { ...filterableFields };

  if (q) {
    filters.$or = [
      { customer: { email: { $ilike: `%${q}%` } } },
      { customer: { first_name: { $ilike: `%${q}%` } } },
      { customer: { last_name: { $ilike: `%${q}%` } } },
    ];
  }

  const { data: quotes, metadata } = await query.graph({
    entity: "quote",
    fields,
    filters,
    pagination: {
      ...pagination,
      skip: pagination.skip!,
    },
  });

  res.json({
    quotes,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
};
