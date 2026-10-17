import {
  createSocialCommerceSDK,
  type SocialCommerceSDKClient,
  type SocialCommerceSDKConfig,
} from "../sdk/client.js"
import type {
  CheckoutHandoffInput,
  CheckoutHandoffResult,
  LiveProductRecord,
  LiveSessionRecord,
  MediaType,
  ReservationRecord,
  ReserveLiveStockInput,
  SocialMediaPostRecord,
  SocialPlatform,
  SocialProductTagRecord,
} from "../modules/social-commerce/types/index.js"

export interface SocialQueryDescriptor<TData> {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TData>
}

export interface SocialMutationDescriptor<TInput, TResult> {
  mutationKey: readonly unknown[]
  mutationFn: (input: TInput) => Promise<TResult>
}

/**
 * Headless React Query / TanStack Query / SWR-compatible query and mutation descriptors
 * for Storefront shoppable feeds, 24h stories, live shopping streams, and checkout handoffs.
 */
export function createSocialCommerceHooks(
  clientOrConfig: SocialCommerceSDKClient | SocialCommerceSDKConfig
) {
  const client =
    "getStoreFeed" in clientOrConfig
      ? clientOrConfig
      : createSocialCommerceSDK(clientOrConfig)

  return {
    client,

    /**
     * Query descriptor for unified shoppable social feed (`GET /store/social/feed`).
     */
    useSocialFeedQuery(params?: {
      platform?: SocialPlatform
      media_type?: MediaType
      shoppable_only?: boolean
      featured_only?: boolean
      limit?: number
      offset?: number
    }): SocialQueryDescriptor<{
      feed: Array<
        SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }
      >
      count: number
      limit: number
      offset: number
    }> {
      return {
        queryKey: ["social-commerce", "store", "feed", params ?? {}] as const,
        queryFn: () => client.getStoreFeed(params),
      }
    },

    /**
     * Query descriptor for active 24h stories (`GET /store/social/stories`).
     * Supports Instagram Stories, Facebook Stories, TikTok Stories, and Local Admin Stories.
     */
    useSocialStoriesQuery(params?: {
      platform?: SocialPlatform
      featured_only?: boolean
      limit?: number
    }): SocialQueryDescriptor<{
      stories: Array<
        SocialMediaPostRecord & { tagged_products: SocialProductTagRecord[] }
      >
      count: number
    }> {
      return {
        queryKey: [
          "social-commerce",
          "store",
          "stories",
          params ?? {},
        ] as const,
        queryFn: () => client.getStoreStories(params),
      }
    },

    /**
     * Query descriptor for a single shoppable post with tagged product hotspots (`GET /store/social/posts/:id`).
     */
    useSocialPostQuery(id: string): SocialQueryDescriptor<{
      post: SocialMediaPostRecord & {
        tagged_products: SocialProductTagRecord[]
      }
    }> {
      return {
        queryKey: ["social-commerce", "store", "post", id] as const,
        queryFn: () => client.getStorePost(id),
      }
    },

    /**
     * Query descriptor for active live shopping streams (`GET /store/social/live`).
     */
    useLiveSessionsQuery(params?: {
      platform?: SocialPlatform
    }): SocialQueryDescriptor<{
      live_sessions: Array<
        LiveSessionRecord & {
          products: Array<
            LiveProductRecord & {
              stock_availability: {
                total: number
                reserved: number
                available: number
              }
            }
          >
        }
      >
      count: number
    }> {
      return {
        queryKey: ["social-commerce", "store", "live", params ?? {}] as const,
        queryFn: () => client.getStoreActiveLiveSessions(params),
      }
    },

    /**
     * Mutation descriptor for atomic flash-sale stock reservation during live streams (`POST /store/social/live`).
     */
    useReserveLiveStockMutation(): SocialMutationDescriptor<
      ReserveLiveStockInput,
      { reservation: ReservationRecord }
    > {
      return {
        mutationKey: ["social-commerce", "store", "live", "reserve"] as const,
        mutationFn: (input: ReserveLiveStockInput) =>
          client.reserveLiveStock(input),
      }
    },

    /**
     * Mutation descriptor for social checkout handoff (`POST /store/social/checkout-handoff`).
     */
    useCheckoutHandoffMutation(): SocialMutationDescriptor<
      CheckoutHandoffInput,
      { handoff: CheckoutHandoffResult }
    > {
      return {
        mutationKey: [
          "social-commerce",
          "store",
          "checkout-handoff",
        ] as const,
        mutationFn: (input: CheckoutHandoffInput) =>
          client.createCheckoutHandoff(input),
      }
    },
  }
}
