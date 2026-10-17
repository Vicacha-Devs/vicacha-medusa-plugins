import { MedusaError } from "@medusajs/framework/utils"
import type {
  CreateStoryGroupInput,
  CreateStoryHotspotInput,
  CreateStorySlideInput,
  CreateStoryStickerInput,
  InteractWithStoryStickerInput,
  RecordStoryEngagementInput,
  UpdateStoryGroupInput,
  UpdateStorySlideInput,
} from "../api/validators"
import type {
  StoriesAnalyticsOverview,
  StoryGroupDTO,
  StoryHotspotDTO,
  StoryPlacementZone,
  StorySlideDTO,
  StoryStickerDTO,
} from "../modules/story/types"

export const storiesQueryKeys = {
  all: ["stories"] as const,
  adminState: (filters?: { product_id?: string }) =>
    filters ? (["stories", "admin", filters] as const) : (["stories", "admin"] as const),
  groups: () => ["stories", "groups"] as const,
  analytics: () => ["stories", "analytics"] as const,
  storefront: (filters?: {
    placement?: StoryPlacementZone
    target_entity_id?: string
    collection_id?: string
    group_id?: string
    product_id?: string
  }) =>
    filters
      ? (["stories", "store", filters] as const)
      : (["stories", "store"] as const),
}

export function matchesStoriesQueryKeyPrefix(
  candidateKey: readonly unknown[],
  prefixKey: readonly unknown[]
): boolean {
  if (candidateKey.length < prefixKey.length) return false
  for (let i = 0; i < prefixKey.length; i++) {
    if (candidateKey[i] !== prefixKey[i]) return false
  }
  return true
}

export interface StoriesSdkOptions {
  baseUrl?: string
  publishableApiKey?: string
  fetchImpl?: typeof fetch
}

export function createStoriesSdk(options?: StoriesSdkOptions) {
  const baseUrl = (options?.baseUrl ?? "").replace(/\/+$/, "")
  const fetchImpl = options?.fetchImpl ?? globalThis.fetch

  async function request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.publishableApiKey
        ? { "x-publishable-api-key": options.publishableApiKey }
        : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    }

    const res = await fetchImpl(`${baseUrl}${path}`, {
      credentials: "include",
      ...init,
      headers,
    })

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        String(json.message || json.error || `HTTP ${res.status}`)
      )
    }
    return json as T
  }

  return {
    admin: {
      listStudioState(filters?: { product_id?: string }) {
        const qs = filters?.product_id
          ? `?product_id=${encodeURIComponent(filters.product_id)}`
          : ""
        return request<{ stories: StorySlideDTO[]; groups: StoryGroupDTO[] }>(
          `/admin/stories${qs}`
        )
      },
      createSlide(payload: CreateStorySlideInput) {
        return request<{ story: StorySlideDTO }>("/admin/stories", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      updateSlide(id: string, payload: UpdateStorySlideInput) {
        return request<{ story: StorySlideDTO }>(
          `/admin/stories/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
      },
      deleteSlide(id: string) {
        return request<{ id: string; deleted: boolean }>(
          `/admin/stories/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        )
      },
      createGroup(payload: CreateStoryGroupInput) {
        return request<{ group: StoryGroupDTO }>("/admin/stories/groups", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      },
      updateGroup(id: string, payload: UpdateStoryGroupInput) {
        return request<{ group: StoryGroupDTO }>(
          `/admin/stories/groups/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        )
      },
      deleteGroup(id: string) {
        return request<{ id: string; deleted: boolean }>(
          `/admin/stories/groups/${encodeURIComponent(id)}`,
          {
            method: "DELETE",
          }
        )
      },
      addHotspot(storyId: string, payload: CreateStoryHotspotInput) {
        return request<{ hotspot: StoryHotspotDTO }>(
          `/admin/stories/${encodeURIComponent(storyId)}/hotspots`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      removeHotspot(storyId: string, hotspotId: string) {
        return request<{ id: string; deleted: boolean }>(
          `/admin/stories/${encodeURIComponent(storyId)}/hotspots`,
          {
            method: "DELETE",
            body: JSON.stringify({ hotspot_id: hotspotId }),
          }
        )
      },
      addSticker(storyId: string, payload: CreateStoryStickerInput) {
        return request<{ sticker: StoryStickerDTO }>(
          `/admin/stories/${encodeURIComponent(storyId)}/stickers`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      removeSticker(storyId: string, stickerId: string) {
        return request<{ id: string; deleted: boolean }>(
          `/admin/stories/${encodeURIComponent(storyId)}/stickers`,
          {
            method: "DELETE",
            body: JSON.stringify({ sticker_id: stickerId }),
          }
        )
      },
      getAnalytics() {
        return request<{ analytics: StoriesAnalyticsOverview }>(
          "/admin/stories/analytics"
        )
      },
    },
    store: {
      listStories(filters?: {
        placement?: StoryPlacementZone
        target_entity_id?: string
        collection_id?: string
        group_id?: string
        product_id?: string
      }) {
        const params = new URLSearchParams()
        if (filters?.placement) params.set("placement", filters.placement)
        if (filters?.target_entity_id) {
          params.set("target_entity_id", filters.target_entity_id)
        }
        if (filters?.collection_id) {
          params.set("collection_id", filters.collection_id)
        }
        if (filters?.group_id) params.set("group_id", filters.group_id)
        if (filters?.product_id) params.set("product_id", filters.product_id)
        const qs = params.toString() ? `?${params.toString()}` : ""
        return request<{ stories: StorySlideDTO[]; groups: StoryGroupDTO[] }>(
          `/store/stories${qs}`
        )
      },
      recordEvent(storyId: string, payload: RecordStoryEngagementInput) {
        return request<{ ok: boolean; story: StorySlideDTO }>(
          `/store/stories/${encodeURIComponent(storyId)}/events`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
      interactWithSticker(
        storyId: string,
        payload: InteractWithStoryStickerInput
      ) {
        return request<{ sticker: StoryStickerDTO }>(
          `/store/stories/${encodeURIComponent(storyId)}/interact`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        )
      },
    },
  }
}

export const defaultStoriesSdk = createStoriesSdk()
