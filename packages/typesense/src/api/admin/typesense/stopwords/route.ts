import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import { AdminStopwordSetSchema } from "../../../middlewares"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const stopwords = await typesenseService.listStopwordSets()
    return res.status(200).json({ stopwords })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to list stopword sets",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = AdminStopwordSetSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid stopword set payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const stopword_set = await typesenseService.upsertStopwordSet({
      id: parsed.data.id!,
      stopwords: parsed.data.stopwords!,
      locale: parsed.data.locale,
    })
    return res.status(200).json({ stopword_set })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to upsert stopword set",
      detail: error?.message || "Unknown error",
    })
  }
}
