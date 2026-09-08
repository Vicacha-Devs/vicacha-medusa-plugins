import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { AdminGetQuoteParamsType } from "../validators";

export const GET = async (
  req: AuthenticatedMedusaRequest<AdminGetQuoteParamsType>,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

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

  const messages: any[] = (quote as any).messages ?? [];

  const adminIds = [
    ...new Set(messages.map((m) => m.admin_id).filter(Boolean)),
  ];

  if (adminIds.length > 0) {
    const userService = req.scope.resolve(Modules.USER);
    const users = await userService.listUsers({ id: adminIds });
    const userById = new Map(users.map((u: any) => [u.id, u]));

    (quote as any).messages = messages.map((m) => {
      if (!m.admin_id) return m;
      const u = userById.get(m.admin_id);
      return {
        ...m,
        admin_name: u
          ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email
          : null,
      };
    });
  }

  res.json({ quote });
};
