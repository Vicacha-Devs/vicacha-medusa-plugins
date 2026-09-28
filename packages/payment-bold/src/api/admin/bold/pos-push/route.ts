import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { IPaymentModuleService } from "@medusajs/framework/types"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const paymentModule: IPaymentModuleService = req.scope.resolve(Modules.PAYMENT)
  const body = req.body as Record<string, unknown>

  const paymentCollectionId = body.paymentCollectionId as string

  if (!paymentCollectionId) {
    res.status(400).json({ message: "Missing required 'paymentCollectionId' parameter." })
    return
  }

  try {
    const paymentSession = await paymentModule.createPaymentSession(
      paymentCollectionId,
      {
        provider_id: "bold-terminal",
        currency_code: (body.currency as string || "COP").toLowerCase(),
        amount: Number(body.amount),
        data: {
          reference: body.reference,
          terminalModel: body.terminalModel,
          terminalSerial: body.terminalSerial,
          userEmail: body.userEmail,
          description: body.description,
        },
      }
    )

    res.status(200).json({ paymentSession })
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to trigger terminal checkout" })
  }
}