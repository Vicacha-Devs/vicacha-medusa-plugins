import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { scanInventoryCountWorkflow } from "../../../../../../workflows"
import type { RecordCountScanBody } from "../../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sessionId = req.params.id || ""
  const body = req.validatedBody as RecordCountScanBody

  const { result } = await scanInventoryCountWorkflow(req.scope).run({
    input: {
      session_id: sessionId,
      ...body,
    },
  })

  res.json(result)
}
