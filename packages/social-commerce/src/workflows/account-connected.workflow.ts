import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  SOCIAL_COMMERCE_MODULE,
  type SocialCommerceService,
  type SocialPlatform,
} from "../modules/social-commerce/index.js"

export interface AccountConnectedWorkflowInput {
  account_id: string
  platform: SocialPlatform
  auto_sync_media?: boolean
}

export const initialAccountSyncStep = createStep(
  "initial-account-sync",
  async (input: AccountConnectedWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    if (input.auto_sync_media === false || input.platform === "local") {
      const account = await socialService.getAccount(input.account_id)
      return new StepResponse({
        account,
        synced_posts: 0,
        synced_stories: 0,
      })
    }

    const syncResult = await socialService.syncAccountMedia(input.account_id, {
      includeStories: true,
    })
    const account = await socialService.getAccount(input.account_id)

    return new StepResponse({
      account,
      synced_posts: syncResult.synced_posts,
      synced_stories: syncResult.synced_stories,
    })
  }
)

export const accountConnectedWorkflow = createWorkflow(
  "account-connected",
  (input: AccountConnectedWorkflowInput) => {
    const result = initialAccountSyncStep(input)
    return new WorkflowResponse(result)
  }
)
