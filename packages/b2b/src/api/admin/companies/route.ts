import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Medusa dashboard fetches /admin/companies to populate the company autocomplete
 * on the customer edit form. There is no native Medusa Company model, so we
 * serve B2B companies from this endpoint.
 */
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const limit = Number(req.query.limit ?? 50)
  const offset = Number(req.query.offset ?? 0)
  const q = req.query.q as string | undefined

  const filters: Record<string, any> = {}
  if (q) {
    filters.$or = [
      { name: { $ilike: `%${q}%` } },
      { email: { $ilike: `%${q}%` } },
    ]
  }

  const { data: companies, metadata } = await query.graph({
    entity: "company",
    fields: ["id", "name"],
    filters,
    pagination: { skip: offset, take: limit },
  })

  res.json({
    companies,
    count: metadata?.count ?? companies.length,
    offset,
    limit,
  })
}
