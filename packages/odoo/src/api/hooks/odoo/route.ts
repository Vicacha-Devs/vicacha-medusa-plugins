import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type OdooModuleService from "../../../modules/odoo/service"
import {
  ODOO_MODULE,
  type OdooWebhookPayload,
} from "../../../modules/odoo/types"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const odooService = req.scope.resolve(ODOO_MODULE) as OdooModuleService
  const payload = (req.validatedBody ?? {}) as OdooWebhookPayload
  const rawBody =
    (req as MedusaRequest & { rawBody?: Buffer | string }).rawBody ??
    JSON.stringify(req.validatedBody ?? {})
  const signatureHeader =
    (req.headers["x-odoo-signature"] as string | undefined) ??
    (req.headers["x-webhook-signature"] as string | undefined) ??
    null

  try {
    const result = await odooService.processWebhookEvent({
      rawBody,
      signatureHeader,
      payload,
    })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const isAuthError = msg.toLowerCase().includes("signature")
    res.status(isAuthError ? 401 : 400).json({ error: msg })
  }
}
