import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  resolveSocialCommerceService,
  type CheckoutHandoffInput,
} from "../modules/social-commerce/index"

const executeCheckoutHandoffStep = createStep(
  "execute-checkout-handoff",
  async (input: CheckoutHandoffInput, { container }) => {
    const socialService = resolveSocialCommerceService(container)

    const result = await socialService.createCheckoutHandoff(input)
    return new StepResponse(result, {
      reservationId: result.reservation_id,
    })
  },
  async (compensationData, { container }) => {
    if (!compensationData?.reservationId) return
    const socialService = resolveSocialCommerceService(container)
    await socialService.reservationService.releaseReservation(
      compensationData.reservationId
    )
  }
)

export const checkoutHandoffWorkflow = createWorkflow(
  "checkout-handoff",
  (input: CheckoutHandoffInput) => {
    const result = executeCheckoutHandoffStep(input)
    return new WorkflowResponse(result)
  }
)
