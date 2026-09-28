import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.status(200).json({
    plugin: "medusa-payment-bold",
    version: "2.0.0",
    status: "active",
    providers: [
      "bold-online",
      "bold-link",
      "bold-button",
      "bold-terminal",
    ],
  })
}