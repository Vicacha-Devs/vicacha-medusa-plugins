import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  SOCIAL_COMMERCE_MODULE,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"

export interface LiveEndedWorkflowInput {
  session_id: string
}

export const endLiveSessionStep = createStep(
  "end-live-session",
  async (input: LiveEndedWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    const result = await socialService.endLiveSession(input.session_id)
    return new StepResponse(result)
  }
)

export const liveEndedWorkflow = createWorkflow(
  "live-ended",
  (input: LiveEndedWorkflowInput) => {
    const result = endLiveSessionStep(input)
    return new WorkflowResponse(result)
  }
)
