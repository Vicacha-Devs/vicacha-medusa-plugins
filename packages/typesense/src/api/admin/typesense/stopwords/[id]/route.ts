import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../modules/typesense/service"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = String(req.params.id || "").trim()
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    await typesenseService.deleteStopwordSet(id)
    return res.status(200).json({
      id,
      object: "stopword_set",
      deleted: true,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to delete stopword set",
      detail: error?.message || "Unknown error",
    })
  }
}
