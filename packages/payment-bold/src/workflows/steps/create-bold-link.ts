import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { IPaymentModuleService } from "@medusajs/framework/types"

export interface CreateBoldLinkStepInput {
  paymentCollectionId?: string
  amount: number
  currency: string
  email: string
  reference: string
  description: string
  vatAmount: number
  consumptionTaxAmount?: number
  callbackUrl: string
  imageUrl?: string
}

export const createBoldLinkStep = createStep(
  "create-bold-link-step",
  async (input: CreateBoldLinkStepInput, { container }) => {
    const paymentModule: IPaymentModuleService = container.resolve(Modules.PAYMENT)
    let collectionId = input.paymentCollectionId
    let createdCollection = false

    // 1. Ensure PaymentCollection exists
    if (!collectionId) {
      const collection = await paymentModule.createPaymentCollections({
        currency_code: input.currency.toLowerCase(),
        amount: input.amount,
      })
      collectionId = collection.id
      createdCollection = true
    }

    // 2. Create Payment Session
    const paymentSession = await paymentModule.createPaymentSession(collectionId, {
      provider_id: "pp_bold-link_bold",
      currency_code: input.currency.toLowerCase(),
      amount: input.amount,
      data: {
        reference: input.reference,
        description: input.description,
        email: input.email,
        callbackUrl: input.callbackUrl,
        vatAmount: input.vatAmount,
        consumptionTaxAmount: input.consumptionTaxAmount,
        imageUrl: input.imageUrl,
      },
    })

    return new StepResponse(
      { paymentSession, paymentCollectionId: collectionId },
      { collectionId: createdCollection ? collectionId : undefined }
    )
  },
  // Compensation logic: clean up payment collection if workflow fails downstream
  async (compensationData, { container }) => {
    if (compensationData?.collectionId) {
      const paymentModule: IPaymentModuleService = container.resolve(Modules.PAYMENT)
      await paymentModule.deletePaymentCollections([compensationData.collectionId])
    }
  }
)