import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyInventoryCountWorkflow } from "../../../../../../workflows"
import type { ApplyCountSessionBody } from "../../../../../validators"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const sessionId = req.params.id || ""
  const body = (req.validatedBody || {}) as ApplyCountSessionBody

  const { result } = await applyInventoryCountWorkflow(req.scope).run({
    input: {
      session_id: sessionId,
      location_id: body.location_id,
    },
  })

  res.json(result)
}
