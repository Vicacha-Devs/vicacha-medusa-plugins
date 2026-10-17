import {
  SOCIAL_COMMERCE_MODULE,
  type SocialCommerceService,
} from "../modules/social-commerce/index.js"

export interface ScheduledJobContext {
  container: {
    resolve: <T = unknown>(key: string) => T
  }
}

export default async function syncSocialMediaAndTokensJob({
  container,
}: ScheduledJobContext): Promise<{
  refreshed_accounts: string[]
  accounts_synced: number
  total_posts: number
  total_stories: number
}> {
  const socialService = container.resolve<SocialCommerceService>(
    SOCIAL_COMMERCE_MODULE
  )

  const refreshResult = await socialService.refreshExpiringAccounts(60)
  const syncResult = await socialService.syncAllAccountsMedia({
    includeStories: true,
  })

  return {
    refreshed_accounts: refreshResult.refreshed,
    accounts_synced: syncResult.accounts_synced,
    total_posts: syncResult.total_posts,
    total_stories: syncResult.total_stories,
  }
}

export const config = {
  name: "social-commerce-sync-media-and-tokens",
  schedule: "0 */30 * * * *", // Every 30 minutes
}
