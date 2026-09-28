import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createBoldPaymentLinkWorkflow } from "@payment-bold/workflows/create-bold-payment-link"

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = req.body as Record<string, unknown>  

  try {
    const { result } = await createBoldPaymentLinkWorkflow(req.scope).run({
      input: {
        paymentCollectionId: body.paymentCollectionId as string | undefined,
        amount: Number(body.amount),
        currency: body.currency as string,
        reference: body.reference as string,
        description: body.description as string,
        email: body.email as string,
        callbackUrl: body.callbackUrl as string,
        vatAmount: Number(body.vatAmount ?? 0),
        consumptionTaxAmount: Number(body.vatAmount ?? 0),
        imageUrl: body.imageUrl as string | undefined,
      },
    })

    res.status(200).json(result)
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Failed to execute payment workflow" })
  }
}