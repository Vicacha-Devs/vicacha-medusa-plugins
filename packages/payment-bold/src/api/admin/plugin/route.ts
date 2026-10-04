import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BOLD_PLUGIN_PROVIDERS } from "@payment-bold/types/constants"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.status(200).json({
    plugin: "medusa-payment-bold",
    version: "2.0.0",
    status: "active",
    providers: BOLD_PLUGIN_PROVIDERS,
  })
}