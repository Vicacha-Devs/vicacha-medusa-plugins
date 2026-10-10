import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../../modules/typesense/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "").trim()
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    const def = await typesenseService.getEntityDefinition(entity)
    return res.status(200).json({
      entity_config: {
        ...def,
        embedder: def.embedder
          ? {
              ...def.embedder,
              api_key: def.embedder.api_key ? "***masked***" : undefined,
            }
          : null,
      },
    })
  } catch (error: any) {
    return res.status(404).json({
      message: `Entity "${entity}" not found`,
      detail: error?.message,
    })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const entity = String(req.params.entity || "").trim()
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService

  try {
    await typesenseService.removeCustomEntityConfig(entity)
    return res.status(200).json({
      id: entity,
      object: "entity_config",
      deleted: true,
    })
  } catch (error: any) {
    return res.status(400).json({
      message: error?.message || "Failed to delete custom entity config",
    })
  }
}
