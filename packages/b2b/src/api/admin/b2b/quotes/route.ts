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

  // Strip virtual/computed fields and cross-module aliases sent by ConfigurableDataTable,
  // messages_count is computed from messages.length; customer is a cross-module link
  // that needs explicit sub-field expansion instead.
  const VIRTUAL_FIELDS = new Set(["messages_count", "customer", "*customer"])
  const baseFields = fields.filter((f) => !VIRTUAL_FIELDS.has(f))
  const listFields = Array.from(new Set([
    "id",
    "customer_id",
    "customer.first_name",
    "customer.last_name",
    "messages.id",
    ...baseFields,
  ]))

  const { data: rawQuotes, metadata } = await query.graph({
    entity: "quote",
    fields: listFields,
    filters,
    pagination: {
      ...pagination,
      skip: pagination.skip!,
    },
  });

  const quotes = rawQuotes.map((quote: any) => {
    const { messages, customer_id, customer: c, ...rest } = quote
    return { 
      ...rest,
      messages_count: messages?.length ?? 0,
      customer: {
        id: customer_id,
        full_name: `${c.first_name} ${c.last_name}`}
    }
  })

  res.json({
    quotes,
    count: metadata!.count,
    offset: metadata!.skip,
    limit: metadata!.take,
  });
};
