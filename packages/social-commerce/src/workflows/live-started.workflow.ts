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

export interface LiveStartedWorkflowInput {
  session_id: string
  stream_url?: string
  platform_live_id?: string
}

export const startLiveSessionStep = createStep(
  "start-live-session",
  async (input: LiveStartedWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    const session = await socialService.startLiveSession(input.session_id, {
      stream_url: input.stream_url,
      platform_live_id: input.platform_live_id,
    })

    return new StepResponse({ session }, { session_id: session.id })
  },
  async (compensateInput: { session_id: string } | undefined, { container }) => {
    if (!compensateInput?.session_id) return
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )
    await socialService.endLiveSession(compensateInput.session_id)
  }
)

export const liveStartedWorkflow = createWorkflow(
  "live-started",
  (input: LiveStartedWorkflowInput) => {
    const result = startLiveSessionStep(input)
    return new WorkflowResponse(result)
  }
)
