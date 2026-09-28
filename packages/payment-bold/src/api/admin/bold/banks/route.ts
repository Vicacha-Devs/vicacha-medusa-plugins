import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BoldOnlinePaymentProviderService } from "@payment-bold/providers/bold-online"

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  try {
    // Resolve the bold-online provider instance from the container
    const boldOnlineService = req.scope.resolve<BoldOnlinePaymentProviderService>("bold-online")

    // Access the PSE banks list via the encapsulated client instance
    const banks = await (boldOnlineService as any).client_.getPseBanks()

    res.status(200).json({ banks })
  } catch (error: any) {
    res.status(500).json({
      message: error.message || "Failed to fetch active PSE banks from Bold API",
    })
  }
}