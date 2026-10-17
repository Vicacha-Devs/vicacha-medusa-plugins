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

export interface MediaSyncedWorkflowInput {
  account_id?: string
  platform?: SocialPlatform
  include_stories?: boolean
}

export const syncSocialMediaStep = createStep(
  "sync-social-media",
  async (input: MediaSyncedWorkflowInput, { container }) => {
    const socialService = container.resolve<SocialCommerceService>(
      SOCIAL_COMMERCE_MODULE
    )

    if (input.account_id) {
      const result = await socialService.syncAccountMedia(input.account_id, {
        includeStories: input.include_stories !== false,
      })
      return new StepResponse({
        accounts_synced: 1,
        total_posts: result.synced_posts,
        total_stories: result.synced_stories,
        errors: [] as Array<{ account_id: string; error: string }>,
      })
    }

    const result = await socialService.syncAllAccountsMedia({
      platform: input.platform,
      includeStories: input.include_stories !== false,
    })

    return new StepResponse(result)
  }
)

export const mediaSyncedWorkflow = createWorkflow(
  "media-synced",
  (input: MediaSyncedWorkflowInput) => {
    const result = syncSocialMediaStep(input)
    return new WorkflowResponse(result)
  }
)
