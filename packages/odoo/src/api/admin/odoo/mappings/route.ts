import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooEntityType,
  type OdooSyncDirection,
} from "../../../../modules/odoo/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const entityType =
    typeof req.query.entity_type === "string"
      ? req.query.entity_type
      : undefined
  const medusaId =
    typeof req.query.medusa_id === "string" ? req.query.medusa_id : undefined

  const filters: Record<string, unknown> = {}
  if (entityType) filters.entity_type = entityType
  if (medusaId) filters.medusa_id = medusaId

  const mappings = await odooService.listErpMappings(filters, { take: 200 })
  res.json({ mappings })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const body = (req.validatedBody ?? {}) as {
    entityType: OdooEntityType
    medusaId: string
    odooId: number
    direction?: OdooSyncDirection
    odooModel?: string
    metadata?: Record<string, unknown> | null
  }
  const mapping = await odooService.upsertMapping(body)
  res.json({ ok: true, mapping })
}
