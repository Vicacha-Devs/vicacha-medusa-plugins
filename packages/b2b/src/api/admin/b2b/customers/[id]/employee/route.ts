import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { id } = req.params

  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: [
      "id",
      "employee.id",
      "employee.spending_limit",
      "employee.is_admin",
      "employee.company.id",
      "employee.company.name",
      "employee.company.currency_code",
    ],
    filters: { id },
  })

  res.json({ employee: (customer as any)?.employee ?? null })
}
