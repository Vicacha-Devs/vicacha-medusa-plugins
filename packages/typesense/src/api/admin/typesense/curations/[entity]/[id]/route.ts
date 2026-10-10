import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../../modules/typesense/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "products").trim()
  const id = String(req.params.id || "").trim()
  const locale =
    typeof req.query?.locale === "string" ? req.query.locale : undefined
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    await typesenseService.deleteCuration(entity, id, locale)
    return res.status(200).json({
      id,
      entity,
      object: "curation",
      deleted: true,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to delete curation rule",
      detail: error?.message || "Unknown error",
    })
  }
}
