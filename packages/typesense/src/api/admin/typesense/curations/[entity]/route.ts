import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../modules/typesense/service"
import { AdminCurationSchema } from "../../../../middlewares"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const curations = await typesenseService.listCurations(entity, locale)
    return res.status(200).json({ entity, curations })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to list curations/overrides",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const parsed = AdminCurationSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid curation rule payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const curation = await typesenseService.upsertCuration(
      entity,
      parsed.data as any,
      locale
    )
    return res.status(200).json({ entity, curation })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to upsert curation/override rule",
      detail: error?.message || "Unknown error",
    })
  }
}
