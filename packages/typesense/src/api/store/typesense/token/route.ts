import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import {
  normalizeStringArrayParam,
  resolveStorefrontSalesChannelIds,
} from "../../../middlewares"
import { StoreScopedTokenQuerySchema } from "../../../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = StoreScopedTokenQuerySchema.safeParse(req.query || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid scoped token query parameters",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const salesChannelIds = resolveStorefrontSalesChannelIds(req)

  try {
    const tokenInfo = await typesenseService.generateScopedSearchToken({
      salesChannelIds,
      entities: normalizeStringArrayParam(parsed.data.entities),
      locale: parsed.data.locale,
      expiresInSeconds: parsed.data.expires_in,
    })

    return res.status(200).json({
      scoped_api_key: tokenInfo.scopedApiKey,
      collections: tokenInfo.collections,
      filter_by: tokenInfo.filterBy,
      expires_at: tokenInfo.expiresAt,
      node: tokenInfo.host,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to generate scoped Typesense search key",
      detail: error?.message || "Unknown error",
    })
  }
}
