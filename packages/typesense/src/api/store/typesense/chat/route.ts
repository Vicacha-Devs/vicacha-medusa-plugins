import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TYPESENSE_MODULE } from "../../../../modules/typesense/types"
import type TypesenseModuleService from "../../../../modules/typesense/service"
import {
  resolveStorefrontSalesChannelIds,
  StoreConversationalChatSchema,
} from "../../../middlewares"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = StoreConversationalChatSchema.safeParse(req.body || {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid conversational search payload",
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  const input = parsed.data
  const typesenseService = req.scope.resolve(
    TYPESENSE_MODULE
  ) as TypesenseModuleService
  const salesChannelIds = resolveStorefrontSalesChannelIds(req)

  try {
    const result = await typesenseService.search({
      entity: input.entity,
      q: input.q,
      mode: "conversational",
      alpha: input.alpha,
      filters: input.filters as Record<string, any> | undefined,
      limit: input.limit,
      locale: input.locale,
      conversationId: input.conversation_id,
      conversationModelId: input.model_id,
      salesChannelIds,
      enforceStorefrontVisibility: true,
    })

    return res.status(200).json({
      answer: result.conversation?.answer || "",
      conversation_id:
        result.conversation?.conversation_id || input.conversation_id || "",
      query: result.query,
      hits: result.hits,
      documents: result.documents,
      search_time_ms: result.search_time_ms,
    })
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to execute conversational RAG search",
      detail: error?.message || "Unknown error",
    })
  }
}
