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

  // Strip the "customer" alias sent by ConfigurableDataTable (it's a cross-module
  // link, not a same-module relation — "*customer" doesn't work here). Always
  // include the explicit customer sub-fields and the FK scalar so the renderer
  // always has data.
  const baseFields = fields.filter((f) => f !== "customer" && f !== "*customer")
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
