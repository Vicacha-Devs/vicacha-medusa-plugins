import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import DianModuleService from "../../../../modules/dian/service"
import { DIAN_MODULE, type EmitDianDocumentInput } from "../../../../types"
import { emitDianDocumentWorkflow } from "../../../../workflows"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dianService = req.scope.resolve<DianModuleService>(DIAN_MODULE)
  const q = (req.validatedQuery || req.query || {}) as Record<string, any>

  const filter: Record<string, unknown> = {}
  if (q.order_id) {
    filter.order_id = q.order_id
  }
  if (q.document_type) {
    filter.document_type = q.document_type
  }
  if (q.status) {
    filter.status = q.status
  }

  const documents = await dianService.listDianElectronicDocuments(filter)
  return res.status(200).json({
    documents,
    count: documents.length,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.validatedBody || req.body || {}) as EmitDianDocumentInput
  const { result } = await emitDianDocumentWorkflow(req.scope).run({
    input: {
      ...body,
      actor_id: (req as any).auth_context?.actor_id ?? null,
    },
  })
  return res.status(201).json({ document: result })
}
