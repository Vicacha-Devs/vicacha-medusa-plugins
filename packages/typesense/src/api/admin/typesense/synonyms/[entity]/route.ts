import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../modules/typesense/service"
import { AdminSynonymSchema } from "../../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const synonyms = await typesenseService.listSynonyms(entity, locale)
    return res.status(200).json({ entity, synonyms })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to list synonyms",
      detail: error?.message || "Unknown error",
    })
  }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const parsed = AdminSynonymSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid synonym rule payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const synonym = await typesenseService.upsertSynonym(
      entity,
      {
        id: parsed.data.id!,
        synonyms: parsed.data.synonyms!,
        root: parsed.data.root,
        locale: parsed.data.locale,
        symbols_to_index: parsed.data.symbols_to_index,
      },
      parsed.data.locale
    )
    return res.status(200).json({ entity, synonym })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to upsert synonym rule",
      detail: error?.message || "Unknown error",
    })
  }
}
