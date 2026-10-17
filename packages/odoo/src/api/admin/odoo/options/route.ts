import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type OdooModuleService from "../../../../modules/odoo/service"
import { ODOO_MODULE } from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: Record<string, unknown>) => Promise<{
      data: Array<Record<string, unknown>>
    }>
  }

  const [stockLocationsRes, collectionsRes, salesChannelsRes, verification] =
    await Promise.all([
      query
        .graph({ entity: "stock_location", fields: ["id", "name"] })
        .catch(() => ({ data: [] })),
      query
        .graph({ entity: "product_collection", fields: ["id", "title"] })
        .catch(() => ({ data: [] })),
      query
        .graph({ entity: "sales_channel", fields: ["id", "name"] })
        .catch(() => ({ data: [] })),
      odooService.verifyConnection(),
    ])

  res.json({
    connected: verification.ok,
    medusa: {
      stockLocations: stockLocationsRes.data ?? [],
      collections: collectionsRes.data ?? [],
      salesChannels: salesChannelsRes.data ?? [],
    },
    odoo: {
      companies: verification.companies ?? [],
      warehouses: verification.warehouses ?? [],
      journals: verification.journals ?? [],
      categories: verification.categories ?? [],
    },
  })
}
