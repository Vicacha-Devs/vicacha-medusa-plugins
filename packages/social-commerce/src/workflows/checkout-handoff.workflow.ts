import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  SOCIAL_COMMERCE_MODULE,
  type CheckoutHandoffInput,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"

export interface CheckoutHandoffWorkflowInput extends CheckoutHandoffInput {
  storefront_base_url?: string
}

export const buildSocialCheckoutHandoffStep = createStep(
  "build-social-checkout-handoff",
  async (input: CheckoutHandoffWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    const handoff = await socialService.createCheckoutHandoff(input, {
      storefrontBaseUrl: input.storefront_base_url,
    })

    return new StepResponse(handoff)
  }
)

export const checkoutHandoffWorkflow = createWorkflow(
  "checkout-handoff",
  (input: CheckoutHandoffWorkflowInput) => {
    const result = buildSocialCheckoutHandoffStep(input)
    return new WorkflowResponse(result)
  }
)
