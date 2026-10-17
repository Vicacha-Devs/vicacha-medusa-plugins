import {
  accountConnectedWorkflow,
  liveEndedWorkflow,
  liveStartedWorkflow,
} from "../workflows/index.js"
import type { MedusaContainer } from "@medusajs/framework/types"
import type { SocialPlatform } from "../modules/social-commerce/types/index.js"

export interface SubscriberArgs<TData = Record<string, unknown>> {
  event: {
    name: string
    data: TData
  }
  container: MedusaContainer
}

export interface SubscriberConfig {
  event: string | string[]
}

export default async function handleSocialEvents({
  event,
  container,
}: SubscriberArgs<Record<string, unknown>>): Promise<void> {
  const eventName = event?.name
  const data = event?.data ?? {}

  if (eventName === "social.account_connected") {
    const accountId = String(data.account_id ?? "")
    const platform = (data.platform ?? "tiktok") as SocialPlatform
    if (accountId) {
      await accountConnectedWorkflow(container).run({
        input: {
          account_id: accountId,
          platform,
          auto_sync_media: data.auto_sync_media !== false,
        },
      })
    }
    return
  }

  if (eventName === "social.live_started") {
    const sessionId = String(data.session_id ?? "")
    if (sessionId) {
      await liveStartedWorkflow(container).run({
        input: {
          session_id: sessionId,
          stream_url:
            typeof data.stream_url === "string" ? data.stream_url : undefined,
          platform_live_id:
            typeof data.platform_live_id === "string"
              ? data.platform_live_id
              : undefined,
        },
      })
    }
    return
  }

  if (eventName === "social.live_ended") {
    const sessionId = String(data.session_id ?? "")
    if (sessionId) {
      await liveEndedWorkflow(container).run({
        input: {
          session_id: sessionId,
        },
      })
    }
  }
}

export const config: SubscriberConfig = {
  event: [
    "social.account_connected",
    "social.media_synced",
    "social.live_started",
    "social.live_ended",
  ],
}
