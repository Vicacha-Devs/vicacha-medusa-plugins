import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooSectionName,
} from "../../../../../modules/odoo/types"

const VALID_SECTIONS = new Set<OdooSectionName>([
  "product",
  "inventory",
  "orders",
  "customers",
  "reconciliation",
  "webhooks",
  "pos",
])

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const section = req.params.section as OdooSectionName
  if (!VALID_SECTIONS.has(section)) {
    res.status(400).json({ error: `Invalid Odoo settings section "${section}".` })
    return
  }

  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const settings = await odooService.getSectionSettings(section)
  res.json({ section, settings })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const section = req.params.section as OdooSectionName
  if (!VALID_SECTIONS.has(section)) {
    res.status(400).json({ error: `Invalid Odoo settings section "${section}".` })
    return
  }

  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const payload = (req.body || {}) as Record<string, unknown>
  const settings = await odooService.saveSectionSettings(section, payload)
  res.json({ ok: true, section, settings })
}
