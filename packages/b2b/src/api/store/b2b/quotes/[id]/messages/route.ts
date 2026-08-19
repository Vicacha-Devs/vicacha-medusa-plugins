import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createQuoteMessageWorkflow } from "@b2b/workflows/quote/workflows";
import { StoreCreateQuoteMessageType } from "@b2b/api/store/b2b/quotes/validators";

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreCreateQuoteMessageType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  await createQuoteMessageWorkflow(req.scope).run({
    input: {
      ...req.validatedBody,
      customer_id: req.auth_context.actor_id,
      quote_id: id,
    },
  });

  const {
    data: [quote],
  } = await query.graph(
    {
      entity: "quote",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ quote });
};
